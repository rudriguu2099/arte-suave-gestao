import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';

@Injectable()
export class UsersSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeed.name);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}
  async onApplicationBootstrap() {
    const email = this.config.get<string>('superAdmin.email')?.trim().toLowerCase();
    if (!email) {
      this.logger.warn('SUPERADMIN_EMAIL não definido. Nenhuma conta privilegiada será provisionada.');
      return;
    }
    const current = await this.users.findOne({ where: { isSuperAdmin: true }, withDeleted: true });
    if (current && current.email !== email) {
      throw new Error(`Já existe um superadmin (${current.email}). Só é permitido um; ajuste SUPERADMIN_EMAIL.`);
    }
    const existing = await this.users.findOne({ where: { email }, withDeleted: true });
    if (existing) {
      if (existing.deletedAt || !existing.isActive || existing.role !== Role.ADMINISTRADOR) {
        throw new Error('A conta configurada para superadmin deve ser um administrador ativo e não excluído.');
      }
      if (!existing.isSuperAdmin) {
        existing.isSuperAdmin = true;
        existing.tokenVersion = (existing.tokenVersion ?? 0) + 1;
        await this.users.save(existing);
        this.logger.log('Flag de superadmin provisionada para a conta configurada.');
      }
      return; // Never reset an existing password on restart.
    }
    const password = this.config.get<string>('superAdmin.password');
    if (!password || password.length < 8) throw new Error('Defina SUPERADMIN_PASSWORD com pelo menos oito caracteres para criar a conta inicial.');
    await this.users.save(this.users.create({
      name: this.config.get<string>('superAdmin.name'),
      email, birthDate: new Date('1990-01-01'), role: Role.ADMINISTRADOR,
      password: await bcrypt.hash(password, 10), isActive: true, isSuperAdmin: true,
      tokenVersion: 0, contactEmails: [email], phones: [],
    }));
    this.logger.log('Conta inicial de superadmin criada pela configuração do servidor.');
  }
}
