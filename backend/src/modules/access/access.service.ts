import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum.js';
import { generateInitialPassword } from '../../common/utils/password-generator.util.js';
import { assertCanManage } from '../../common/utils/can-manage.util.js';
import { User } from '../users/entities/user.entity.js';
import { Student } from './entities/student.entity.js';
import { SchoolGroup } from './entities/school-group.entity.js';
import { ProfileDto } from './dto/profile.dto.js';
import { ageOn, birthDateToIso, displayDate } from './access.validation.js';
import type {
  AccessAccount,
  AccessState,
  ProfileResult,
  ProfileRole,
  ProfileTarget,
} from './access.contract.js';

const databaseRoles: Record<ProfileRole, Role> = {
  admin: Role.ADMINISTRADOR,
  responsible: Role.RESPONSAVEL,
  athlete: Role.ATLETA_MAIOR,
};
const uiRoles: Record<Role, ProfileRole> = {
  [Role.ADMINISTRADOR]: 'admin',
  [Role.RESPONSAVEL]: 'responsible',
  [Role.ATLETA_MAIOR]: 'athlete',
};

@Injectable()
export class AccessService implements OnApplicationBootstrap {
  constructor(private readonly database: DataSource) {}

  async onApplicationBootstrap() {
    const repository = this.database.getRepository(SchoolGroup);
    // Initial catalog only. Never replace an existing class configuration.
    if ((await repository.count()) === 0) {
      await repository.insert([
        { id: 'adult', name: 'Adulto', schedule: 'Seg/Qua' },
        { id: 'child', name: 'Infantil iniciante', schedule: 'Seg/Qua/Sex' },
        { id: 'juvenile', name: 'Juvenil', schedule: 'Ter/Qui' },
      ]);
    }
  }

  private accountView(user: User, students: Student[]): AccessAccount {
    return {
      id: user.id,
      name: user.name,
      birthDate: displayDate(user.birthDate),
      emails: user.contactEmails?.length ? user.contactEmails : [user.email],
      phones: user.phones ?? [],
      role: uiRoles[user.role],
      active: user.isActive,
      isSuperAdmin: user.isSuperAdmin === true,
      athleteIds: students
        .filter((student) =>
          user.role === Role.RESPONSAVEL
            ? student.guardianId === user.id
            : user.role === Role.ATLETA_MAIOR && student.accountId === user.id,
        )
        .map((student) => student.id),
    };
  }

  async state(actorId: string): Promise<AccessState> {
    return this.database.transaction('REPEATABLE READ', async (manager) => {
      const users = manager.getRepository(User);
      const current = await users.findOneBy({ id: actorId });
      if (!current?.isActive)
        throw new UnauthorizedException('Conta indisponível.');
      const staff = current.role === Role.ADMINISTRADOR;
      const students = await manager.getRepository(Student).find({
        where: staff
          ? {}
          : current.role === Role.RESPONSAVEL
            ? { guardianId: current.id }
            : { accountId: current.id },
        order: { name: 'ASC' },
      });
      const accounts = staff
        ? await users.find({ order: { name: 'ASC' } })
        : [current];
      const allGroups = await manager
        .getRepository(SchoolGroup)
        .find({ order: { name: 'ASC' } });
      return {
        current: this.accountView(current, students),
        accounts: accounts.map((account) =>
          this.accountView(account, students),
        ),
        athletes: students.map((student) => ({
          id: student.id,
          name: student.name,
          birthDate: displayDate(student.birthDate),
          emails: student.emails,
          phones: student.phones,
          groupId: student.groupId,
          belt: student.belt,
          attendance: student.attendance,
          active: student.active,
          accountId: student.accountId ?? undefined,
          guardianId: student.guardianId ?? undefined,
        })),
        groups: staff
          ? allGroups
          : allGroups.filter((group) =>
              students.some((student) => student.groupId === group.id),
            ),
        events: [], // No event service has been delivered in this sprint.
      };
    });
  }

  private async lockActor(manager: EntityManager, actorId: string): Promise<User> {
    const actor = await manager
      .getRepository(User)
      .findOne({ where: { id: actorId }, lock: { mode: 'pessimistic_write' } });
    if (!actor?.isActive) throw new UnauthorizedException('Conta indisponível.');
    return actor;
  }

  private async transaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.database.transaction('SERIALIZABLE', work);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if ((code === '40001' || code === '40P01') && attempt < 2) continue;
        if (code === '23505')
          throw new ConflictException(
            'Já existe uma conta com este e-mail ou aluno vinculado.',
          );
        throw error;
      }
    }
  }

  async saveProfile(
    actorId: string,
    dto: ProfileDto,
    target?: ProfileTarget,
  ): Promise<ProfileResult> {
    const birthDate = birthDateToIso(dto.birthDate);
    const name = dto.name.trim();
    const emails = dto.emails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const phones = dto.phones.map((phone) => phone.trim()).filter(Boolean);
    if (!name) throw new BadRequestException('Informe o nome.');
    if (new Set(emails).size !== emails.length)
      throw new BadRequestException('E-mails repetidos.');
    if (phones.some((phone) => !/^\d{10,13}$/.test(phone.replace(/\D/g, ''))))
      throw new BadRequestException('Telefone com DDD inválido.');
    const minor = dto.role === 'athlete' && ageOn(birthDate) < 18;
    if (!minor && !emails.length)
      throw new BadRequestException(
        'Informe um e-mail para a conta de acesso.',
      );

    return this.transaction(async (manager) => {
      const actor = await this.lockActor(manager, actorId);
      assertCanManage(actor, databaseRoles[dto.role]);
      const users = manager.getRepository(User);
      const pupils = manager.getRepository(Student);
      let account: User | null = null;
      let student: Student | null = null;
      if (target?.kind === 'account') {
        account = await users.findOneBy({ id: target.id });
        if (!account) throw new NotFoundException('Conta não encontrada.');
        student = await pupils.findOneBy({ accountId: account.id });
      } else if (target?.kind === 'athlete') {
        student = await pupils.findOneBy({ id: target.id });
        if (!student) throw new NotFoundException('Aluno não encontrado.');
        account = student.accountId
          ? await users.findOneBy({ id: student.accountId })
          : null;
      }
      assertCanManage(actor, account?.role);
      if (account?.isSuperAdmin && dto.role !== 'admin')
        throw new BadRequestException(
          'O superadmin é provisionado pelo servidor.',
        );
      if (
        account?.role === Role.RESPONSAVEL &&
        dto.role !== 'responsible' &&
        (await pupils.countBy({ guardianId: account.id }))
      ) {
        throw new BadRequestException(
          'Reatribua os alunos deste responsável antes de mudar sua função.',
        );
      }
      if (dto.role === 'athlete') {
        if (
          !dto.groupId ||
          !(await manager
            .getRepository(SchoolGroup)
            .existsBy({ id: dto.groupId }))
        ) {
          throw new BadRequestException('Selecione uma turma válida.');
        }
        if (minor) {
          const guardian = dto.guardianId
            ? await users.findOneBy({ id: dto.guardianId })
            : null;
          if (!guardian?.isActive || guardian.role !== Role.RESPONSAVEL) {
            throw new BadRequestException(
              'Selecione um responsável ativo já cadastrado.',
            );
          }
        }
      }
      let password: string | undefined;
      let accountId: string | null = account?.id ?? null;
      if (!minor) {
        const allUsers = await users.find({ withDeleted: true });
        if (
          allUsers.some(
            (user) =>
              user.id !== account?.id &&
              [user.email, ...(user.contactEmails ?? [])].some((email) =>
                emails.includes(email.toLowerCase()),
              ),
          )
        ) {
          throw new ConflictException('Um dos e-mails já está cadastrado.');
        }
        if (!account) {
          password = generateInitialPassword(
            name,
            new Date(birthDate + 'T00:00:00Z'),
          );
          account = users.create({
            password: await bcrypt.hash(password, 10),
            isActive: true,
            isSuperAdmin: false,
            tokenVersion: 0,
          });
        }
        // Only these fields are mutable: a forged superadmin flag is never assigned.
        Object.assign(account, {
          name,
          birthDate: new Date(birthDate + 'T00:00:00Z'),
          email: emails[0],
          contactEmails: emails,
          phones,
          role: databaseRoles[dto.role],
        });
        account = await users.save(account);
        accountId = account.id;
      } else if (account) {
        account.isActive = false;
        account.tokenVersion = (account.tokenVersion ?? 0) + 1;
        await users.save(account);
        await users.softDelete(account.id);
        accountId = null;
      }
      if (dto.role === 'athlete') {
        student ??= pupils.create({
          active: true,
          belt: 'Branca',
          attendance: [],
        });
        Object.assign(student, {
          name,
          birthDate,
          emails,
          phones,
          groupId: dto.groupId,
          accountId,
          guardianId: minor ? dto.guardianId : null,
        });
        await pupils.save(student);
      } else if (student) {
        Object.assign(student, {
          name,
          birthDate,
          emails,
          phones,
          accountId,
          guardianId: null,
        });
        await pupils.save(student);
      }
      return { name, hasAccess: !minor, ...(password ? { password } : {}) };
    });
  }

  async toggleActive(actorId: string, target: ProfileTarget): Promise<void> {
    await this.transaction(async (manager) => {
      const actor = await this.lockActor(manager, actorId);
      assertCanManage(actor, undefined);
      const users = manager.getRepository(User);
      const pupils = manager.getRepository(Student);
      let account: User | null = null;
      let student: Student | null = null;
      if (target.kind === 'account') {
        account = await users.findOneBy({ id: target.id });
        if (!account) throw new NotFoundException('Conta não encontrada.');
      } else {
        student = await pupils.findOneBy({ id: target.id });
        if (!student) throw new NotFoundException('Aluno não encontrado.');
        account = student.accountId
          ? await users.findOneBy({ id: student.accountId })
          : null;
      }
      if (account) {
        assertCanManage(actor, account.role);
        if (account.isSuperAdmin)
          throw new BadRequestException(
            'O superadmin não pode ser inativado pela aplicação.',
          );
        account.isActive = !account.isActive;
        account.tokenVersion = (account.tokenVersion ?? 0) + 1;
        await users.save(account);
      } else if (student) {
        student.active = !student.active;
        await pupils.save(student);
      }
    });
  }
}
