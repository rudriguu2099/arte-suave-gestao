import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { GroupsService, summarizeSessions } from './groups.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: {
    schoolGroup: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    student: { count: ReturnType<typeof vi.fn> };
  };
  const kids = {
    name: ' Kids ',
    ageRange: '4 a 12 anos',
    level: 'Iniciante',
    sessions: [
      { weekday: 3, start: '18:00', end: '19:00' },
      { weekday: 1, start: '18:00', end: '19:00' },
    ],
  };

  beforeEach(async () => {
    prisma = {
      schoolGroup: {
        create: vi.fn(async ({ data }) => data),
        update: vi.fn(async ({ data }) => data),
        findUnique: vi.fn(),
      },
      student: { count: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  it('resume dias com o mesmo horário juntos', () => {
    expect(
      summarizeSessions([
        { weekday: 1, start: '18:00', end: '19:00' },
        { weekday: 3, start: '18:00', end: '19:00' },
        { weekday: 6, start: '09:00', end: '10:30' },
      ]),
    ).toBe('Seg/Qua 18:00-19:00, Sáb 09:00-10:30');
  });

  describe('create', () => {
    it('ordena as sessões, apara o nome e grava o resumo', async () => {
      const group = await service.create(kids);

      expect(group.name).toBe('Kids');
      expect(group.sessions).toEqual([kids.sessions[1], kids.sessions[0]]);
      expect(group.schedule).toBe('Seg/Qua 18:00-19:00');
    });

    it('rejeita término antes do início', async () => {
      await expect(
        service.create({ ...kids, sessions: [{ weekday: 1, start: '19:00', end: '18:00' }] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('mantém o que não foi enviado', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue({ id: 'g1', active: true, schedule: '', ...kids });

      const group = await service.update('g1', { level: 'Avançado' });

      expect(group).toMatchObject({ name: 'Kids', level: 'Avançado', schedule: 'Seg/Qua 18:00-19:00' });
    });

    it('turma antiga sem dias de treino precisa completá-los', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue({
        id: 'adult', name: 'Adulto', ageRange: '', level: '', sessions: [], schedule: 'Seg/Qua', active: true,
      });

      await expect(service.update('adult', { name: 'Adulto' })).rejects.toThrow(BadRequestException);
    });

    it('lança NotFoundException quando a turma não existe', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue(null);

      await expect(service.update('x', { name: 'Kids' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActive', () => {
    it('não inativa turma com alunos ativos', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue({ id: 'g1', active: true });
      prisma.student.count.mockResolvedValue(2);

      await expect(service.toggleActive('g1')).rejects.toThrow(BadRequestException);
      expect(prisma.schoolGroup.update).not.toHaveBeenCalled();
    });

    it('reativa turma inativa', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue({ id: 'g1', active: false });

      await service.toggleActive('g1');

      expect(prisma.schoolGroup.update).toHaveBeenCalledWith({ where: { id: 'g1' }, data: { active: true } });
    });
  });
});
