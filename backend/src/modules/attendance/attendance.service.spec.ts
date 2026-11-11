import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    schoolGroup: { findUnique: ReturnType<typeof vi.fn> };
    student: { count: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    attendance: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    attendanceRecord: { findMany: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> };
  };

  const records = [
    { studentId: '11111111-1111-4111-8111-111111111111', present: true },
    { studentId: '22222222-2222-4222-8222-222222222222', present: false },
  ];
  const dto = { groupId: 'turma-1', date: '20/10/2026', records };

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date('2026-11-06T12:00:00Z') });
      prisma = {
      schoolGroup: { findUnique: vi.fn().mockResolvedValue({ id: 'turma-1' }) },
      student: {
        count: vi.fn().mockResolvedValue(records.length),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      attendance: {
        create: vi.fn(({ data }) => Promise.resolve({ id: 'a1', ...data, records: data.records.create })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      attendanceRecord: { findMany: vi.fn().mockResolvedValue([]), groupBy: vi.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AttendanceService);
  });

  afterEach(() => vi.useRealTimers());

  it('grava a chamada com um registro por atleta e devolve a data em DD/MM/AAAA', async () => {
    const result = await service.create(dto);

    expect(prisma.student.count).toHaveBeenCalledWith({
      where: { id: { in: records.map((r) => r.studentId) }, groupId: 'turma-1', active: true },
    });
    expect(prisma.attendance.create.mock.calls[0][0].data).toEqual({
      groupId: 'turma-1',
      date: new Date('2026-10-20T00:00:00Z'),
      records: { create: records },
    });
    expect(result).toMatchObject({ date: '20/10/2026', records });
  });

  it('aceita a data de hoje e recusa data futura', async () => {
    await expect(service.create({ ...dto, date: '06/11/2026' })).resolves.toBeDefined();
    await expect(service.create({ ...dto, date: '07/11/2026' })).rejects.toThrow(BadRequestException);
  });

  it('recusa turma inexistente', async () => {
    prisma.schoolGroup.findUnique.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toThrow(NotFoundException);
  });

  it('recusa atleta inativo ou de outra turma', async () => {
    prisma.student.count.mockResolvedValue(1);
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it('recusa segunda chamada da turma na mesma data', async () => {
    prisma.attendance.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  // HU025 / RF022: histórico de frequência por atleta e por turma.
  const period = { from: '01/11/2026', to: '10/11/2026' };
  const joao = '11111111-1111-4111-8111-111111111111';
  const ana = '22222222-2222-4222-8222-222222222222';
  const adulto = { id: 'turma-1', name: 'Adulto' };
  // "to" inclusivo: 01/11 00:00 até antes de 11/11 00:00.
  const dateFilter = { gte: new Date('2026-11-01T00:00:00Z'), lt: new Date('2026-11-11T00:00:00Z') };

  describe('historyByStudent', () => {
    beforeEach(() => prisma.student.findUnique.mockResolvedValue({ id: joao, name: 'João Silva' }));

    it('soma presenças e faltas e devolve as chamadas com data em DD/MM/AAAA', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { present: true, attendance: { date: new Date('2026-11-10T00:00:00Z'), group: adulto } },
        { present: false, attendance: { date: new Date('2026-11-05T00:00:00Z'), group: adulto } },
        { present: true, attendance: { date: new Date('2026-11-03T00:00:00Z'), group: adulto } },
      ]);

      const result = await service.historyByStudent(joao, period);

      expect(result).toEqual({
        student: { id: joao, name: 'João Silva' },
        period,
        totals: { presences: 2, absences: 1, total: 3 },
        records: [
          { date: '10/11/2026', present: true, group: adulto },
          { date: '05/11/2026', present: false, group: adulto },
          { date: '03/11/2026', present: true, group: adulto },
        ],
      });
    });

    it('filtra pela data da chamada com a data final inclusiva', async () => {
      await service.historyByStudent(joao, period);

      expect(prisma.attendanceRecord.findMany.mock.calls[0][0].where).toEqual({
        studentId: joao,
        attendance: { date: dateFilter },
      });
    });

    it('recusa atleta inexistente', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.historyByStudent(joao, period)).rejects.toThrow(NotFoundException);
      expect(prisma.attendanceRecord.findMany).not.toHaveBeenCalled();
    });

    it('recusa período com data inicial superior à final sem consultar o banco', async () => {
      await expect(service.historyByStudent(joao, { from: '10/11/2026', to: '01/11/2026' })).rejects.toThrow(BadRequestException);
      expect(prisma.student.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('historyByGroup', () => {
    beforeEach(() => prisma.schoolGroup.findUnique.mockResolvedValue(adulto));

    it('lista as chamadas, junta as contagens com os nomes e soma os totais da turma', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        { id: 'c3', date: new Date('2026-11-10T00:00:00Z'), records: [{ present: true }, { present: true }] },
        { id: 'c2', date: new Date('2026-11-05T00:00:00Z'), records: [{ present: true }, { present: false }] },
        { id: 'c1', date: new Date('2026-11-03T00:00:00Z'), records: [{ present: true }, { present: true }] },
      ]);
      prisma.attendanceRecord.groupBy.mockResolvedValue([
        { studentId: joao, present: true, _count: { _all: 2 } },
        { studentId: joao, present: false, _count: { _all: 1 } },
        { studentId: ana, present: true, _count: { _all: 3 } },
      ]);
      prisma.student.findMany.mockResolvedValue([
        { id: ana, name: 'Ana Souza' },
        { id: joao, name: 'João Silva' },
      ]);

      const result = await service.historyByGroup('turma-1', period);

      expect(result).toEqual({
        group: adulto,
        period,
        totals: { sessions: 3, presences: 5, absences: 1 },
        attendances: [
          { id: 'c3', date: '10/11/2026', presences: 2, absences: 0 },
          { id: 'c2', date: '05/11/2026', presences: 1, absences: 1 },
          { id: 'c1', date: '03/11/2026', presences: 2, absences: 0 },
        ],
        athletes: [
          { id: ana, name: 'Ana Souza', presences: 3, absences: 0 },
          { id: joao, name: 'João Silva', presences: 2, absences: 1 },
        ],
      });
    });

    it('filtra as chamadas da turma no período e busca cada atleta uma vez só', async () => {
      prisma.attendanceRecord.groupBy.mockResolvedValue([
        { studentId: joao, present: true, _count: { _all: 2 } },
        { studentId: joao, present: false, _count: { _all: 1 } },
      ]);

      await service.historyByGroup('turma-1', period);

      expect(prisma.attendance.findMany.mock.calls[0][0]).toMatchObject({ where: { groupId: 'turma-1', date: dateFilter }, orderBy: { date: 'desc' } });
      expect(prisma.attendanceRecord.groupBy.mock.calls[0][0].where).toEqual({ attendance: { groupId: 'turma-1', date: dateFilter } });
      expect(prisma.student.findMany.mock.calls[0][0].where).toEqual({ id: { in: [joao] } });
    });

    it('recusa turma inexistente', async () => {
      prisma.schoolGroup.findUnique.mockResolvedValue(null);

      await expect(service.historyByGroup('turma-1', period)).rejects.toThrow(NotFoundException);
      expect(prisma.attendanceRecord.groupBy).not.toHaveBeenCalled();
    });

    it('devolve tudo zerado quando não há chamadas no período', async () => {
      const result = await service.historyByGroup('turma-1', period);

      expect(result).toEqual({
        group: adulto,
        period,
        totals: { sessions: 0, presences: 0, absences: 0 },
        attendances: [],
        athletes: [],
      });
    });
  });
});
