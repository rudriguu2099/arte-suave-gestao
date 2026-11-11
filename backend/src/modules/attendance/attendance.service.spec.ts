import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { Role } from '../../common/enums/role.enum.js';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    user: { findFirst: ReturnType<typeof vi.fn> };
    schoolGroup: { findUnique: ReturnType<typeof vi.fn> };
    student: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    attendance: { create: ReturnType<typeof vi.fn> };
    attendanceRecord: { findMany: ReturnType<typeof vi.fn> };
  };

  const records = [
    { studentId: '11111111-1111-4111-8111-111111111111', present: true },
    { studentId: '22222222-2222-4222-8222-222222222222', present: false },
  ];
  const dto = { groupId: 'turma-1', date: '20/10/2026', records };

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date('2026-11-06T12:00:00Z') });
    prisma = {
      user: { findFirst: vi.fn() },
      schoolGroup: { findUnique: vi.fn().mockResolvedValue({ id: 'turma-1' }) },
      student: { count: vi.fn().mockResolvedValue(records.length), findMany: vi.fn().mockResolvedValue([]) },
      attendance: { create: vi.fn(({ data }) => Promise.resolve({ id: 'a1', ...data, records: data.records.create })) },
      attendanceRecord: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AttendanceService);
  });

  afterEach(() => vi.useRealTimers());

  describe('create (HU023 / RF020)', () => {
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
  });

  describe('findMine (HU026 / HU027 / RF023)', () => {
    const adultUser = { id: 'u-adult', role: Role.ATLETA_MAIOR, isActive: true };
    const guardianUser = { id: 'u-guard', role: Role.RESPONSAVEL, isActive: true };
    const adultStudent = { id: 's-adult', name: 'Anna Beatryz', groupId: 'adult', accountId: 'u-adult', guardianId: null };
    const ward1 = { id: 's-ward1', name: 'João Neto', groupId: 'kids', accountId: null, guardianId: 'u-guard' };
    const ward2 = { id: 's-ward2', name: 'Maria Clara', groupId: 'kids', accountId: null, guardianId: 'u-guard' };

    it('HU026: Atleta Maior de Idade consulta a própria frequência no mês selecionado', async () => {
      prisma.user.findFirst.mockResolvedValue(adultUser);
      prisma.student.findMany.mockResolvedValue([adultStudent]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { studentId: 's-adult', present: true, attendance: { date: new Date('2026-09-02T00:00:00Z') } },
        { studentId: 's-adult', present: false, attendance: { date: new Date('2026-09-04T00:00:00Z') } },
        { studentId: 's-adult', present: true, attendance: { date: new Date('2026-09-07T00:00:00Z') } },
      ]);

      const result = await service.findMine('u-adult', { month: 9, year: 2026 });

      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { accountId: 'u-adult' },
        orderBy: { name: 'asc' },
      });
      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith({
        where: {
          studentId: { in: ['s-adult'] },
          attendance: {
            date: {
              gte: new Date('2026-09-01T00:00:00Z'),
              lt: new Date('2026-10-01T00:00:00Z'),
            },
          },
        },
        include: { attendance: { select: { date: true } } },
        orderBy: { attendance: { date: 'asc' } },
      });
      expect(result).toEqual({
        month: 9,
        year: 2026,
        athletes: [
          {
            studentId: 's-adult',
            studentName: 'Anna Beatryz',
            groupId: 'adult',
            attendance: [true, false, true],
            records: [
              { date: '02/09/2026', present: true },
              { date: '04/09/2026', present: false },
              { date: '07/09/2026', present: true },
            ],
            presentCount: 2,
            absentCount: 1,
            totalSessions: 3,
          },
        ],
      });
    });

    it('HU027: Responsável consulta a frequência de cada um dos seus atletas dependentes vinculados', async () => {
      prisma.user.findFirst.mockResolvedValue(guardianUser);
      prisma.student.findMany.mockResolvedValue([ward1, ward2]);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { studentId: 's-ward1', present: true, attendance: { date: new Date('2026-11-02T00:00:00Z') } },
        { studentId: 's-ward1', present: true, attendance: { date: new Date('2026-11-04T00:00:00Z') } },
        { studentId: 's-ward2', present: false, attendance: { date: new Date('2026-11-02T00:00:00Z') } },
      ]);

      const result = await service.findMine('u-guard');

      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { guardianId: 'u-guard' },
        orderBy: { name: 'asc' },
      });
      expect(result.month).toBe(11);
      expect(result.year).toBe(2026);
      expect(result.athletes).toEqual([
        {
          studentId: 's-ward1',
          studentName: 'João Neto',
          groupId: 'kids',
          attendance: [true, true],
          records: [
            { date: '02/11/2026', present: true },
            { date: '04/11/2026', present: true },
          ],
          presentCount: 2,
          absentCount: 0,
          totalSessions: 2,
        },
        {
          studentId: 's-ward2',
          studentName: 'Maria Clara',
          groupId: 'kids',
          attendance: [false],
          records: [{ date: '02/11/2026', present: false }],
          presentCount: 0,
          absentCount: 1,
          totalSessions: 1,
        },
      ]);
    });

    it('RF023 / RNF004: veda consulta de outros atletas por Atleta Maior ou Responsável', async () => {
      prisma.user.findFirst.mockResolvedValue(adultUser);
      prisma.student.findMany.mockResolvedValue([adultStudent]);

      await expect(service.findMine('u-adult', { studentId: 's-ward1' })).rejects.toThrow(ForbiddenException);

      prisma.user.findFirst.mockResolvedValue(guardianUser);
      prisma.student.findMany.mockResolvedValue([ward1]);

      await expect(service.findMine('u-guard', { studentId: 's-adult' })).rejects.toThrow(ForbiddenException);
      expect(prisma.attendanceRecord.findMany).not.toHaveBeenCalled();
    });

    it('recusa conta inativa ou inexistente', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findMine('u-missing')).rejects.toThrow(UnauthorizedException);
    });
  });
});
