import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SchoolGroup } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.module.js';
import type { GroupDto, GroupSessionDto, UpdateGroupDto } from './dto/group.dto.js';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Resumo exibido nas telas (ex.: 'Seg/Qua 18:00-19:30'); dias com o mesmo horário são agrupados.
export function summarizeSessions(sessions: GroupSessionDto[]): string {
  const byTime = new Map<string, string[]>();
  for (const { weekday, start, end } of sessions) {
    const time = start + '-' + end;
    byTime.set(time, [...(byTime.get(time) ?? []), WEEKDAYS[weekday]]);
  }
  return [...byTime].map(([time, days]) => days.join('/') + ' ' + time).join(', ');
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: GroupDto): Promise<SchoolGroup> {
    return this.prisma.schoolGroup.create({ data: this.fields(dto) });
  }

  // Edição parcial: completa o que não veio com os dados atuais e valida tudo de novo.
  async update(id: string, patch: UpdateGroupDto): Promise<SchoolGroup> {
    const current = await this.findOrFail(id);
    const sent = Object.fromEntries(Object.entries(patch).filter(([, value]) => value != null));
    const data = this.fields({ ...current, sessions: current.sessions as unknown as GroupSessionDto[], ...sent });
    return this.prisma.schoolGroup.update({ where: { id }, data });
  }

  // Inativar não mexe nos alunos: eles precisam ser transferidos antes (RN005: uma turma por atleta).
  async toggleActive(id: string): Promise<void> {
    const group = await this.findOrFail(id);
    if (group.active && (await this.prisma.student.count({ where: { groupId: id, active: true } }))) {
      throw new BadRequestException('Transfira os alunos ativos desta turma antes de inativá-la.');
    }
    await this.prisma.schoolGroup.update({ where: { id }, data: { active: !group.active } });
  }

  private fields(dto: GroupDto) {
    const [name, ageRange, level] = [dto.name, dto.ageRange, dto.level].map((value) => value.trim());
    // Turmas antigas (seed) não têm critério nem sessions: a primeira edição precisa completá-los.
    if (!name || !ageRange || !level) throw new BadRequestException('Informe nome, faixa etária e nível técnico.');
    if (!dto.sessions.length) throw new BadRequestException('Informe ao menos um dia de treino.');
    if (dto.sessions.some(({ start, end }) => start >= end)) {
      throw new BadRequestException('O horário de término deve ser depois do início.');
    }
    const sessions = dto.sessions
      .map(({ weekday, start, end }) => ({ weekday, start, end }))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
    return { name, ageRange, level, sessions, schedule: summarizeSessions(sessions) };
  }

  private async findOrFail(id: string): Promise<SchoolGroup> {
    const group = await this.prisma.schoolGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Turma não encontrada.');
    return group;
  }
}
