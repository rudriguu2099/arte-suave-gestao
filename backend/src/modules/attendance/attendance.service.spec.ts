import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    schoolGroup: { findUnique: ReturnType<typeof vi.fn> };
    student: { count: ReturnType<typeof vi.fn> };
    attendance: { create: ReturnType<typeof vi.fn> };
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
      student: { count: vi.fn().mockResolvedValue(records.length) },
      attendance: { create: vi.fn(({ data }) => Promise.resolve({ id: 'a1', ...data, records: data.records.create })) },
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
});
