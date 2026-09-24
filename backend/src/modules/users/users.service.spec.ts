import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findOneBy: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    manager: { transaction: ReturnType<typeof vi.fn> };
  };
  let studentsRepository: { update: ReturnType<typeof vi.fn> };
  let usersInTransaction: { softDelete: ReturnType<typeof vi.fn> };
  const superAdmin = { id: 's1', email: 's@x.com', role: Role.ADMINISTRADOR, isSuperAdmin: true };
  const admin = { id: 'a1', email: 'a@x.com', role: Role.ADMINISTRADOR, isSuperAdmin: false };

  beforeEach(async () => {
    repository = {
      findOneBy: vi.fn(),
      save: vi.fn(async (data) => data),
      manager: { transaction: vi.fn() },
    };
    studentsRepository = { update: vi.fn() };
    usersInTransaction = { softDelete: vi.fn() };
    repository.manager.transaction.mockImplementation(async (work) =>
      work({
        getRepository: (entity: unknown) => (entity === User ? usersInTransaction : studentsRepository),
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: repository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('changePassword (auto-serviço)', () => {
    beforeEach(async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u1', password: await bcrypt.hash('correct', 10) });
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
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('atualiza a senha (em hash) e invalida as sessões', async () => {
      await service.changePassword('u1', { currentPassword: 'correct', newPassword: 'new-password' });

      const savedArg = repository.save.mock.calls[0][0];
      await expect(bcrypt.compare('new-password', savedArg.password)).resolves.toBe(true);
      expect(savedArg.tokenVersion).toBe(1);
    });
  });

  describe('resetPassword (RF003 - assistida pelo administrador)', () => {
    it('redefine a senha de um atleta sem exigir a senha atual', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u1', role: Role.ATLETA_MAIOR, password: 'old-hash' });

      await service.resetPassword(admin, 'u1', 'new-password-123');

      const savedArg = repository.save.mock.calls[0][0];
      await expect(bcrypt.compare('new-password-123', savedArg.password)).resolves.toBe(true);
    });

    it('administrador não redefine a senha de outro administrador', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u2', role: Role.ADMINISTRADOR, password: 'old-hash' });

      await expect(service.resetPassword(admin, 'u2', 'new-password-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('superadmin redefine a senha de um administrador', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u2', role: Role.ADMINISTRADOR, password: 'old-hash' });

      await expect(service.resetPassword(superAdmin, 'u2', 'new-password-123')).resolves.toBeUndefined();
    });

    it('lança BadRequestException quando a nova senha é igual à atual', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'u1',
        role: Role.RESPONSAVEL,
        password: await bcrypt.hash('same-password', 10),
      });

      await expect(service.resetPassword(admin, 'u1', 'same-password')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança NotFoundException quando o usuário não existe', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.resetPassword(admin, 'missing', 'new-password-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('administrador remove um responsável e inativa os alunos vinculados', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u1', role: Role.RESPONSAVEL });

      await service.remove(admin, 'u1');

      expect(studentsRepository.update).toHaveBeenCalledWith({ guardianId: 'u1' }, { active: false });
      expect(studentsRepository.update).toHaveBeenCalledWith({ accountId: 'u1' }, { active: false });
      expect(usersInTransaction.softDelete).toHaveBeenCalledWith('u1');
    });

    it('administrador não remove outro administrador', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u2', role: Role.ADMINISTRADOR });

      await expect(service.remove(admin, 'u2')).rejects.toThrow(ForbiddenException);
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    it('ninguém remove o superadmin', async () => {
      repository.findOneBy.mockResolvedValue({ id: 's1', role: Role.ADMINISTRADOR, isSuperAdmin: true });

      await expect(service.remove(superAdmin, 's1')).rejects.toThrow(BadRequestException);
    });
  });
});
