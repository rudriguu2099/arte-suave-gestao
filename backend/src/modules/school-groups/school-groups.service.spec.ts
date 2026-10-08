import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { SchoolGroupsService } from './school-groups.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('SchoolGroupsService', () => {
  let service: SchoolGroupsService;
  let prisma: {
    schoolGroup: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    student: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const groupId = 'adult';

  const fakeGroup = {
    id: groupId,
    name: 'Adulto',
    schedule: 'Seg/Qua',
  };

  const fakeStudents = [
    { id: 'a', name: 'Ana', groupId, active: true },
    { id: 'b', name: 'Bruno', groupId, active: true },
  ];

  beforeEach(async () => {
    prisma = {
      schoolGroup: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      student: {
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolGroupsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SchoolGroupsService>(SchoolGroupsService);
  });

  describe('getStudentsByGroup', () => {
    it('retorna os atletas ativos da turma ordenados por nome', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue(fakeGroup);
      prisma.student.findMany.mockResolvedValue(fakeStudents);

      const result = await service.getStudentsByGroup(groupId);

      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { groupId, active: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(fakeStudents);
    });

    it('lança NotFoundException quando a turma não existe', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.getStudentsByGroup('turma-inexistente'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getStudentsByGroup('turma-inexistente'),
      ).rejects.toThrow('Turma não encontrada');

      expect(prisma.student.findMany).not.toHaveBeenCalled();
    });

    it('retorna lista vazia quando a turma existe mas não tem atletas', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue(fakeGroup);
      prisma.student.findMany.mockResolvedValue([]);

      const result = await service.getStudentsByGroup(groupId);

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('retorna todas as turmas ordenadas por nome', async () => {
      const groups = [
        { id: 'adult', name: 'Adulto', schedule: 'Seg/Qua' },
        { id: 'child', name: 'Infantil iniciante', schedule: 'Seg/Qua/Sex' },
        { id: 'juvenile', name: 'Juvenil', schedule: 'Ter/Qui' },
      ];
      prisma.schoolGroup.findMany.mockResolvedValue(groups);

      const result = await service.findAll();

      expect(prisma.schoolGroup.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, schedule: true },
      });
      expect(result).toEqual(groups);
    });
  });
});