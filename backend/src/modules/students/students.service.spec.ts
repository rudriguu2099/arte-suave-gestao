import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { StudentsService } from './students.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: {
    student: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    schoolGroup: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  const studentId = '11111111-1111-1111-1111-111111111111';
  const groupId = 'adult';

  const fakeStudent = {
    id: studentId,
    name: 'João Silva',
    birthDate: new Date('2000-01-01'),
    emails: [],
    phones: [],
    groupId: 'child',
    belt: 'Branca',
    attendance: [],
    active: true,
    accountId: null,
    guardianId: null,
  };

  const fakeGroup = {
    id: groupId,
    name: 'Adulto',
    schedule: 'Seg/Qua',
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      schoolGroup: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  // -------------------------------------------------------------
  // HU012 — changeGroup
  // -------------------------------------------------------------
  describe('changeGroup', () => {
    it('move o atleta para a turma informada', async () => {
      prisma.student.findUnique.mockResolvedValue(fakeStudent);
      prisma.schoolGroup.findUnique.mockResolvedValue(fakeGroup);
      prisma.student.update.mockResolvedValue({
        ...fakeStudent,
        groupId,
        group: fakeGroup,
      });

      const result = await service.changeGroup(studentId, groupId);

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: studentId },
        data: { groupId },
        include: { group: true },
      });
      expect(result.groupId).toBe(groupId);
      expect(result.group).toEqual(fakeGroup);
    });

    it('lança NotFoundException quando o atleta não existe', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.changeGroup(studentId, groupId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.changeGroup(studentId, groupId),
      ).rejects.toThrow('Atleta não encontrado');

      expect(prisma.schoolGroup.findUnique).not.toHaveBeenCalled();
      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando a turma não existe', async () => {
      prisma.student.findUnique.mockResolvedValue(fakeStudent);
      prisma.schoolGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.changeGroup(studentId, 'turma-inexistente'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.changeGroup(studentId, 'turma-inexistente'),
      ).rejects.toThrow('Turma não encontrada');

      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('não atualiza o atleta se a turma não existir', async () => {
      prisma.student.findUnique.mockResolvedValue(fakeStudent);
      prisma.schoolGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.changeGroup(studentId, 'turma-inexistente'),
      ).rejects.toThrow();

      expect(prisma.student.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------
  // HU014 — findAll (filtros + absenceCount)
  // -------------------------------------------------------------
  describe('findAll', () => {
    const row = (over: Record<string, unknown> = {}) => ({
      id: 'aaa',
      name: 'Ana',
      birthDate: new Date('2000-01-01'),
      belt: 'Branca',
      active: true,
      groupId: 'adult',
      attendance: [true, false, true],
      group: { id: 'adult', name: 'Adulto' },
      ...over,
    });

    it('sem filtros retorna todos, ordenados por nome', async () => {
      prisma.student.findMany.mockResolvedValue([row()]);

      await service.findAll({});

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('filtra por groupId', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll({ groupId: 'adult' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: 'adult' },
        }),
      );
    });

    it('filtra por situação ativo', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll({ active: true });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });

    it('filtra por situação inativo', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll({ active: false });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: false },
        }),
      );
    });

    it('busca por nome (case-insensitive)', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'joao' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'joao', mode: 'insensitive' } },
        }),
      );
    });

    it('combina os três filtros', async () => {
      prisma.student.findMany.mockResolvedValue([]);

      await service.findAll({ groupId: 'adult', active: true, search: 'ana' });

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            groupId: 'adult',
            active: true,
            name: { contains: 'ana', mode: 'insensitive' },
          },
        }),
      );
    });

    it('calcula absenceCount a partir de attendance', async () => {
      prisma.student.findMany.mockResolvedValue([
        row({ attendance: [true, false, true, false, false] }),
      ]);

      const result = await service.findAll({});

      expect(result[0].absenceCount).toBe(3);
    });

    it('retorna absenceCount 0 quando attendance está vazio', async () => {
      prisma.student.findMany.mockResolvedValue([row({ attendance: [] })]);

      const result = await service.findAll({});

      expect(result[0].absenceCount).toBe(0);
    });

    it('retorna absenceCount 0 quando attendance não é array', async () => {
      prisma.student.findMany.mockResolvedValue([row({ attendance: null })]);

      const result = await service.findAll({});

      expect(result[0].absenceCount).toBe(0);
    });
  });
});