import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { pgErrorCode, PrismaService } from '../../prisma/prisma.module.js';
import { displayDate } from '../access/access.validation.js';
import { parseDate } from '../finance/finance.service.js';
import type { AttendanceDto } from './dto/attendance.dto.js';

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
}
