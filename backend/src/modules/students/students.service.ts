import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module.js';
import { ListStudentsQueryDto } from './dto/list-students-query.dto.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async changeGroup(studentId: string, groupId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Atleta não encontrado');

    const group = await this.prisma.schoolGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Turma não encontrada');

    return this.prisma.student.update({
      where: { id: studentId },
      data: { groupId },
      include: { group: true },
    });
  }

  async findAll(query: ListStudentsQueryDto) {
    const where: {
      groupId?: string;
      active?: boolean;
      name?: { contains: string; mode: 'insensitive' };
      OR?: Array<{ accountId: null } | { account: { role: 'ATLETA_MAIOR' } }>;
    } = {};

    if (query.groupId) where.groupId = query.groupId;
    if (typeof query.active === 'boolean') where.active = query.active;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    where.OR = [{ accountId: null }, { account: { role: 'ATLETA_MAIOR' } }];
    
    const students = await this.prisma.student.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        birthDate: true,
        belt: true,
        active: true,
        groupId: true,
        attendance: true,
        group: { select: { id: true, name: true } },
        guardianId: true,
        guardian: { select: { name: true } },
      },
    });

    return students.map((student) => ({
      id: student.id,
      name: student.name,
      birthDate: student.birthDate,
      belt: student.belt,
      active: student.active,
      groupId: student.groupId,
      group: student.group,
      guardianId: student.guardianId,
      guardian: student.guardian,
      absenceCount: this.countAbsences(student.attendance),
    }));
  }

  private countAbsences(attendance: unknown): number {
    if (!Array.isArray(attendance)) return 0;
    return attendance.filter((entry) => entry === false).length;
  }
}
