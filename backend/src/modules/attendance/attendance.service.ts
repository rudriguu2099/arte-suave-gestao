import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { pgErrorCode, PrismaService } from '../../prisma/prisma.module.js';
import { displayDate } from '../access/access.validation.js';
import { parseDate } from '../finance/finance.service.js';
import type { AttendanceDto, AttendanceHistoryQueryDto, AttendanceQueryDto } from './dto/attendance.dto.js';

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

  // HU026 / HU027 / RF023: Atleta maior consulta a própria frequência; Responsável consulta a de cada dependente vinculado.
  async findMine(actorId: string, query: AttendanceQueryDto = {}) {
    const actor = await this.prisma.user.findFirst({ where: { id: actorId, deletedAt: null } });
    if (!actor?.isActive) throw new UnauthorizedException('Conta indisponível.');

    const now = today();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const where =
      actor.role === Role.ADMINISTRADOR
        ? query.studentId
          ? { id: query.studentId }
          : {}
        : actor.role === Role.RESPONSAVEL
          ? { guardianId: actor.id }
          : { accountId: actor.id };

    const ownedStudents = await this.prisma.student.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (query.studentId) {
      const target = ownedStudents.find((student) => student.id === query.studentId);
      if (!target) {
        if (actor.role === Role.ADMINISTRADOR) {
          throw new NotFoundException('Atleta não encontrado.');
        }
        throw new ForbiddenException(
          actor.role === Role.RESPONSAVEL
            ? 'Você só pode consultar a frequência dos seus atletas dependentes vinculados.'
            : 'Você só pode consultar a sua própria frequência.',
        );
      }
    }

    const students = query.studentId
      ? ownedStudents.filter((student) => student.id === query.studentId)
      : ownedStudents;

    if (!students.length) {
      return { month, year, athletes: [] };
    }

    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId: { in: students.map((student) => student.id) },
        attendance: { date: { gte: start, lt: end } },
      },
      include: { attendance: { select: { date: true } } },
      orderBy: { attendance: { date: 'asc' } },
    });

    const byStudent = new Map<string, Array<{ date: string; present: boolean }>>();
    for (const row of rows) {
      const list = byStudent.get(row.studentId) ?? [];
      list.push({ date: displayDate(row.attendance.date), present: row.present });
      byStudent.set(row.studentId, list);
    }

    return {
      month,
      year,
      athletes: students.map((student) => {
        const records = byStudent.get(student.id) ?? [];
        const attendance = records.map((record) => record.present);
        const presentCount = attendance.filter(Boolean).length;
        return {
          studentId: student.id,
          studentName: student.name,
          groupId: student.groupId,
          attendance,
          records,
          presentCount,
          absentCount: attendance.length - presentCount,
          totalSessions: attendance.length,
        };
      }),
    };
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
