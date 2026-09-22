import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';

@Injectable()
export class UsersSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeed.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService, // Injeta o ConfigService do NestJS
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    // puxa da .env
    const adminEmail = this.configService.get<string>('DEFAULT_ADMIN_EMAIL') || 'admin@artesuave.com';
    const adminPassword = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || 'admin123';
    const adminName = this.configService.get<string>('DEFAULT_ADMIN_NAME') || 'Administrador';

    const existingAdmin = await this.userRepository.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const admin = this.userRepository.create({
        name: adminName,
        email: adminEmail,
        password: passwordHash,
        birthDate: new Date('1990-01-01'),
        role: Role.ADMINISTRADOR,
        isActive: true,
      });

      await this.userRepository.save(admin);
      this.logger.log(`🔑 Administrador padrão criado com o e-mail: ${adminEmail}`);
    }
  }
}