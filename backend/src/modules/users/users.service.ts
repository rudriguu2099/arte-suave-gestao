import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.module.js';
import type { ChangePasswordDto } from '../auth/dto/change-password.dto.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { assertCanManage } from '../../common/utils/can-manage.util.js';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findForAuthentication(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
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
    // Alunos sob guarda ou vinculados à conta são inativados (não apagados, para manter o histórico).
    await this.prisma.$transaction([
      this.prisma.student.updateMany({ where: { guardianId: id }, data: { active: false } }),
      this.prisma.student.updateMany({ where: { accountId: id }, data: { active: false } }),
      this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
  }

  private async setPassword(user: User, newPassword: string): Promise<void> {
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, SALT_ROUNDS), tokenVersion: { increment: 1 } },
    });
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
