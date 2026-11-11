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
import type { AttendanceDto, AttendanceQueryDto } from './dto/attendance.dto.js';

const today = () => new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }) + 'T00:00:00Z');

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
}
