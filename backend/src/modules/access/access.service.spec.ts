import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { vi } from 'vitest';
import { AccessService } from './access.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';
import { Role } from '../../common/enums/role.enum.js';

describe('AccessService.setGuardian (HU010)', () => {
  let service: AccessService;
  let prisma: {
    user: { findFirst: ReturnType<typeof vi.fn> };
    student: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  const admin = { id: 'a1', role: Role.ADMINISTRADOR, isActive: true };
  const guardian = { id: 'g1', role: Role.RESPONSAVEL, isActive: true };
  const minor = { id: 's1', birthDate: new Date('2015-01-10'), accountId: null, guardianId: null };

  beforeEach(async () => {
    prisma = {
      user: { findFirst: vi.fn(async ({ where }) => [admin, guardian].find((u) => u.id === where.id) ?? null) },
      student: { findUnique: vi.fn().mockResolvedValue(minor), update: vi.fn() },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(async (work) => work(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  it('vincula o atleta menor a um responsável ativo', async () => {
    await service.setGuardian('a1', 's1', 'g1');

    expect(prisma.student.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { guardianId: 'g1' } });
  });

  it('desfaz o vínculo', async () => {
    await service.setGuardian('a1', 's1', null);

    expect(prisma.student.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { guardianId: null } });
  });

  it('não vincula atleta maior de idade', async () => {
    prisma.student.findUnique.mockResolvedValue({ ...minor, birthDate: new Date('2000-01-10') });

    await expect(service.setGuardian('a1', 's1', 'g1')).rejects.toThrow(BadRequestException);
  });

  it('não vincula a quem não é responsável', async () => {
    await expect(service.setGuardian('a1', 's1', 'a1')).rejects.toThrow(BadRequestException);
    expect(prisma.student.update).not.toHaveBeenCalled();
  });

  it('só administrador gerencia vínculos', async () => {
    await expect(service.setGuardian('g1', 's1', 'g1')).rejects.toThrow(ForbiddenException);
  });
});
