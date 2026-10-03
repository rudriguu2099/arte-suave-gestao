import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';
import { Role } from '../../common/enums/role.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    student: { updateMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  const superAdmin = { id: 's1', email: 's@x.com', role: Role.ADMINISTRADOR, isSuperAdmin: true };
  const admin = { id: 'a1', email: 'a@x.com', role: Role.ADMINISTRADOR, isSuperAdmin: false };

  beforeEach(async () => {
    prisma = {
      user: { findFirst: vi.fn(), update: vi.fn(async ({ data }) => data) },
      student: { updateMany: vi.fn() },
      $transaction: vi.fn(async (operations) => Promise.all(operations)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('changePassword (auto-serviço)', () => {
    beforeEach(async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', password: await bcrypt.hash('correct', 10) });
    });

    it('lança UnauthorizedException quando a senha atual está incorreta', async () => {
      await expect(
        service.changePassword('u1', { currentPassword: 'wrong', newPassword: 'new-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança BadRequestException quando a nova senha é igual à atual', async () => {
      await expect(
        service.changePassword('u1', { currentPassword: 'correct', newPassword: 'correct' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('atualiza a senha (em hash) e invalida as sessões', async () => {
      await service.changePassword('u1', { currentPassword: 'correct', newPassword: 'new-password' });

      const { where, data } = prisma.user.update.mock.calls[0][0];
      expect(where).toEqual({ id: 'u1' });
      await expect(bcrypt.compare('new-password', data.password)).resolves.toBe(true);
      expect(data.tokenVersion).toEqual({ increment: 1 });
    });
  });

  describe('resetPassword (RF003 - assistida pelo administrador)', () => {
    it('redefine a senha de um atleta sem exigir a senha atual', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.ATLETA_MAIOR, password: 'old-hash' });

      await service.resetPassword(admin, 'u1', 'new-password-123');

      const { data } = prisma.user.update.mock.calls[0][0];
      await expect(bcrypt.compare('new-password-123', data.password)).resolves.toBe(true);
    });

    it('administrador não redefine a senha de outro administrador', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', role: Role.ADMINISTRADOR, password: 'old-hash' });

      await expect(service.resetPassword(admin, 'u2', 'new-password-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('superadmin redefine a senha de um administrador', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', role: Role.ADMINISTRADOR, password: 'old-hash' });

      await expect(service.resetPassword(superAdmin, 'u2', 'new-password-123')).resolves.toBeUndefined();
    });

    it('lança BadRequestException quando a nova senha é igual à atual', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        role: Role.RESPONSAVEL,
        password: await bcrypt.hash('same-password', 10),
      });

      await expect(service.resetPassword(admin, 'u1', 'same-password')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança NotFoundException quando o usuário não existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(admin, 'missing', 'new-password-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('administrador remove um responsável e inativa os alunos vinculados', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', role: Role.RESPONSAVEL });

      await service.remove(admin, 'u1');

      expect(prisma.student.updateMany).toHaveBeenCalledWith({ where: { guardianId: 'u1' }, data: { active: false } });
      expect(prisma.student.updateMany).toHaveBeenCalledWith({ where: { accountId: 'u1' }, data: { active: false } });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { deletedAt: expect.any(Date) } });
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('administrador não remove outro administrador', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', role: Role.ADMINISTRADOR });

      await expect(service.remove(admin, 'u2')).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('ninguém remove o superadmin', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 's1', role: Role.ADMINISTRADOR, isSuperAdmin: true });

      await expect(service.remove(superAdmin, 's1')).rejects.toThrow(BadRequestException);
    });
  });
});
