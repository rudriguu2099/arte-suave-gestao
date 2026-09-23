import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import type { ChangePasswordDto } from '../auth/dto/change-password.dto.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { assertCanManage } from '../../common/utils/can-manage.util.js';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  findForAuthentication(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async resetPassword(actor: JwtPayload, id: string, newPassword: string): Promise<void> {
    const user = await this.findUserOrFail(id);
    assertCanManage(actor, user.role);
    await this.setPassword(user, newPassword);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUserOrFail(id);
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    await this.setPassword(user, dto.newPassword);
  }

  async remove(actor: JwtPayload, id: string): Promise<void> {
    const user = await this.findUserOrFail(id);
    if (user.isSuperAdmin) throw new BadRequestException('Não é permitido remover o superadmin pela aplicação.');
    assertCanManage(actor, user.role);
    await this.usersRepository.softDelete(id);
  }

  private async setPassword(user: User, newPassword: string): Promise<void> {
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.usersRepository.save(user);
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
