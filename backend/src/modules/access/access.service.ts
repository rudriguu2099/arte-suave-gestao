import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, type Student, type User } from '../../generated/prisma/client.js';
import { PrismaService, pgErrorCode } from '../../prisma/prisma.module.js';
import { Role } from '../../common/enums/role.enum.js';
import { generateInitialPassword } from '../../common/utils/password-generator.util.js';
import { assertCanManage } from '../../common/utils/can-manage.util.js';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto.js';
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
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    // Initial catalog only. Never replace an existing class configuration.
    if ((await this.prisma.schoolGroup.count()) === 0) {
      await this.prisma.schoolGroup.createMany({
        data: [
          { id: 'adult', name: 'Adulto', schedule: 'Seg/Qua' },
          { id: 'child', name: 'Infantil iniciante', schedule: 'Seg/Qua/Sex' },
          { id: 'juvenile', name: 'Juvenil', schedule: 'Ter/Qui' },
        ],
      });
    }
  }

  private accountView(user: User, students: Student[]): AccessAccount {
    const contactEmails = user.contactEmails as string[];
    return {
      id: user.id,
      name: user.name,
      birthDate: displayDate(user.birthDate),
      emails: contactEmails.length ? contactEmails : [user.email],
      phones: user.phones as string[],
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

  async me(actorId: string): Promise<AccessAccount> {
    const user = await this.prisma.user.findFirst({ where: { id: actorId, deletedAt: null } });
    if (!user?.isActive) throw new UnauthorizedException('Conta indisponível.');
    const students = await this.prisma.student.findMany({
      where: user.role === Role.RESPONSAVEL ? { guardianId: user.id } : { accountId: user.id },
    });
    return this.accountView(user, students);
  }

  async state(actorId: string): Promise<AccessState> {
    return this.prisma.$transaction(
      async (tx) => {
        const current = await tx.user.findFirst({ where: { id: actorId, deletedAt: null } });
        if (!current?.isActive)
          throw new UnauthorizedException('Conta indisponível.');
        const staff = current.role === Role.ADMINISTRADOR;
        const students = await tx.student.findMany({
          where: staff
            ? {}
            : current.role === Role.RESPONSAVEL
              ? { guardianId: current.id }
              : { accountId: current.id },
          orderBy: { name: 'asc' },
        });
        const accounts = staff
          ? await tx.user.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
          : [current];
        const allGroups = await tx.schoolGroup.findMany({ orderBy: { name: 'asc' } });
        return {
          current: this.accountView(current, students),
          accounts: accounts.map((account) =>
            this.accountView(account, students),
          ),
          athletes: students.map((student) => ({
            id: student.id,
            name: student.name,
            birthDate: displayDate(student.birthDate),
            emails: student.emails as string[],
            phones: student.phones as string[],
            groupId: student.groupId,
            belt: student.belt,
            attendance: student.attendance as boolean[],
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async lockActor(tx: Prisma.TransactionClient, actorId: string): Promise<User> {
    // Prisma não tem lock pessimista na API: SELECT ... FOR UPDATE manual.
    await tx.$queryRaw`SELECT 1 FROM "users" WHERE "id" = ${actorId}::uuid FOR UPDATE`;
    const actor = await tx.user.findFirst({ where: { id: actorId, deletedAt: null } });
    if (!actor?.isActive) throw new UnauthorizedException('Conta indisponível.');
    return actor;
  }

  private async transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const code = pgErrorCode(error);
        if ((code === '40001' || code === '40P01') && attempt < 2) continue;
        if (code === '23505')
          throw new ConflictException(
            'Já existe uma conta com este e-mail ou aluno vinculado.',
          );
        throw error;
      }
    }
  }

  private async loadTarget(
    db: Prisma.TransactionClient,
    target: ProfileTarget,
  ): Promise<{ account: User | null; student: Student | null }> {
    if (target.kind === 'account') {
      const account = await db.user.findFirst({ where: { id: target.id, deletedAt: null } });
      if (!account) throw new NotFoundException('Conta não encontrada.');
      return { account, student: await db.student.findUnique({ where: { accountId: account.id } }) };
    }
    const student = await db.student.findUnique({ where: { id: target.id } });
    if (!student) throw new NotFoundException('Aluno não encontrado.');
    const account = student.accountId
      ? await db.user.findFirst({ where: { id: student.accountId, deletedAt: null } })
      : null;
    return { account, student };
  }

  // Edição parcial: completa o que não veio com os dados atuais e segue o fluxo completo de validação.
  async updateProfile(
    actorId: string,
    patch: UpdateProfileDto,
    target: ProfileTarget,
  ): Promise<ProfileResult> {
    const { account, student } = await this.loadTarget(this.prisma, target);
    const contactEmails = account?.contactEmails as string[] | undefined;
    const current: ProfileDto = {
      name: (account ?? student!).name,
      birthDate: displayDate((account ?? student!).birthDate),
      role: account ? uiRoles[account.role] : 'athlete',
      emails: account
        ? contactEmails?.length ? contactEmails : [account.email]
        : (student!.emails as string[]),
      phones: (account?.phones ?? student!.phones) as string[],
      groupId: student?.groupId,
      guardianId: student?.guardianId ?? undefined,
    };
    const sent = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    return this.saveProfile(actorId, { ...current, ...sent }, target);
  }

  async saveProfile(
    actorId: string,
    dto: ProfileDto,
    target?: ProfileTarget,
  ): Promise<ProfileResult> {
    const birthDate = birthDateToIso(dto.birthDate);
    const birthDay = new Date(birthDate + 'T00:00:00Z');
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

    return this.transaction(async (tx) => {
      const actor = await this.lockActor(tx, actorId);
      assertCanManage(actor, databaseRoles[dto.role]);
      let { account, student } = target
        ? await this.loadTarget(tx, target)
        : { account: null as User | null, student: null as Student | null };
      assertCanManage(actor, account?.role);
      if (account?.isSuperAdmin && dto.role !== 'admin')
        throw new BadRequestException(
          'O superadmin é provisionado pelo servidor.',
        );
      if (
        account?.role === Role.RESPONSAVEL &&
        dto.role !== 'responsible' &&
        (await tx.student.count({ where: { guardianId: account.id } }))
      ) {
        throw new BadRequestException(
          'Reatribua os alunos deste responsável antes de mudar sua função.',
        );
      }
      if (dto.role === 'athlete') {
        if (
          !dto.groupId ||
          !(await tx.schoolGroup.count({ where: { id: dto.groupId } }))
        ) {
          throw new BadRequestException('Selecione uma turma válida.');
        }
        if (minor) {
          const guardian = dto.guardianId
            ? await tx.user.findFirst({ where: { id: dto.guardianId, deletedAt: null } })
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
        // Inclui contas excluídas: o e-mail delas continua reservado.
        const allUsers = await tx.user.findMany();
        if (
          allUsers.some(
            (user) =>
              user.id !== account?.id &&
              [user.email, ...(user.contactEmails as string[])].some((email) =>
                emails.includes(email.toLowerCase()),
              ),
          )
        ) {
          throw new ConflictException('Um dos e-mails já está cadastrado.');
        }
        // Only these fields are mutable: a forged superadmin flag is never assigned.
        const fields = {
          name,
          birthDate: birthDay,
          email: emails[0],
          contactEmails: emails,
          phones,
          role: databaseRoles[dto.role],
        };
        if (!account) {
          password = generateInitialPassword(name, birthDay);
          account = await tx.user.create({
            data: { ...fields, password: await bcrypt.hash(password, 10) },
          });
        } else {
          account = await tx.user.update({ where: { id: account.id }, data: fields });
        }
        accountId = account.id;
      } else if (account) {
        await tx.user.update({
          where: { id: account.id },
          data: { isActive: false, tokenVersion: { increment: 1 }, deletedAt: new Date() },
        });
        accountId = null;
      }
      if (dto.role === 'athlete') {
        const data = {
          name,
          birthDate: birthDay,
          emails,
          phones,
          groupId: dto.groupId!,
          accountId,
          guardianId: minor ? dto.guardianId : null,
        };
        if (student) await tx.student.update({ where: { id: student.id }, data });
        else await tx.student.create({ data });
      } else if (student) {
        await tx.student.update({
          where: { id: student.id },
          data: { name, birthDate: birthDay, emails, phones, accountId, guardianId: null },
        });
      }
      return { name, hasAccess: !minor, ...(password ? { password } : {}) };
    });
  }

  async toggleActive(actorId: string, target: ProfileTarget): Promise<void> {
    await this.transaction(async (tx) => {
      const actor = await this.lockActor(tx, actorId);
      assertCanManage(actor, undefined);
      const { account, student } = await this.loadTarget(tx, target);
      if (account) {
        assertCanManage(actor, account.role);
        if (account.isSuperAdmin)
          throw new BadRequestException(
            'O superadmin não pode ser inativado pela aplicação.',
          );
        await tx.user.update({
          where: { id: account.id },
          data: { isActive: !account.isActive, tokenVersion: { increment: 1 } },
        });
      } else if (student) {
        await tx.student.update({
          where: { id: student.id },
          data: { active: !student.active },
        });
      }
    });
  }
}
