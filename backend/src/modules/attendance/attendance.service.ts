import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { pgErrorCode, PrismaService } from '../../prisma/prisma.module.js';
import { displayDate } from '../access/access.validation.js';
import { parseDate } from '../finance/finance.service.js';
import type { AttendanceDto, AttendanceHistoryQueryDto } from './dto/attendance.dto.js';

const today = () => new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }) + 'T00:00:00Z');

// HU025: converte o período DD/MM/AAAA em filtro do Prisma; "to" entra inteiro na busca.
function periodFilter({ from, to }: AttendanceHistoryQueryDto) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (start > end) throw new BadRequestException('A data inicial não pode ser superior à data final.');
  return { gte: start, lt: new Date(end.getTime() + 86_400_000) };
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ groupId, date, records }: AttendanceDto) {
    const day = parseDate(date);
    if (day > today()) throw new BadRequestException('A data da chamada não pode ser futura.');

    const group = await this.prisma.schoolGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Turma não encontrada.');

    const ids = records.map((record) => record.studentId);
    const valid = await this.prisma.student.count({ where: { id: { in: ids }, groupId, active: true } });
    if (valid !== ids.length) throw new BadRequestException('A chamada só pode ter atletas ativos desta turma.');

    try {
      const attendance = await this.prisma.attendance.create({
        data: { groupId, date: day, records: { create: records } },
        include: { records: true },
      });
      return { ...attendance, date: displayDate(attendance.date) };
    } catch (error) {
      if (['P2002', '23505'].includes(pgErrorCode(error) ?? '')) throw new ConflictException('Já existe chamada desta turma nesta data.');
      throw error;
    }
  }

  // HU025 / RF022: presenças e faltas do atleta no período, chamadas mais recentes primeiro.
  async historyByStudent(studentId: string, query: AttendanceHistoryQueryDto) {
    const date = periodFilter(query);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    });
    if (!student) throw new NotFoundException('Atleta não encontrado.');

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId, attendance: { date } },
      include: { attendance: { include: { group: { select: { id: true, name: true } } } } },
      orderBy: { attendance: { date: 'desc' } },
    });

    const presences = records.filter((record) => record.present).length;

    return {
      student,
      period: { from: query.from, to: query.to },
      totals: { presences, absences: records.length - presences, total: records.length },
      records: records.map((record) => ({
        date: displayDate(record.attendance.date),
        present: record.present,
        group: record.attendance.group,
      })),
    };
  }

  // HU025 / RF022: presenças e faltas de cada atleta nas chamadas da turma no período.
  async historyByGroup(groupId: string, query: AttendanceHistoryQueryDto) {
    const date = periodFilter(query);

    const group = await this.prisma.schoolGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    if (!group) throw new NotFoundException('Turma não encontrada.');

    const [attendances, counts] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { groupId, date },
        orderBy: { date: 'desc' },
        select: { id: true, date: true, records: { select: { present: true } } },
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['studentId', 'present'],
        where: { attendance: { groupId, date } },
        _count: { _all: true },
      }),
    ]);

    const students = await this.prisma.student.findMany({
      where: { id: { in: [...new Set(counts.map((row) => row.studentId))] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const athletes = students.map((student) => {
      const count = (present: boolean) =>
        counts.find((row) => row.studentId === student.id && row.present === present)?._count._all ?? 0;
      return { id: student.id, name: student.name, presences: count(true), absences: count(false) };
    });

    return {
      group,
      period: { from: query.from, to: query.to },
      totals: {
        sessions: attendances.length,
        presences: athletes.reduce((sum, athlete) => sum + athlete.presences, 0),
        absences: athletes.reduce((sum, athlete) => sum + athlete.absences, 0),
      },
      attendances: attendances.map((attendance) => {
        const presences = attendance.records.filter((record) => record.present).length;
        return { id: attendance.id, date: displayDate(attendance.date), presences, absences: attendance.records.length - presences };
      }),
      athletes,
    };
  }
}
