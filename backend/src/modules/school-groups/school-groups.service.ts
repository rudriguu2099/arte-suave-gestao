import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module.js';

@Injectable()
export class SchoolGroupsService {
    constructor(private readonly prisma: PrismaService) {}

    async getStudentsByGroup(groupId: string) {
        const group = await this.prisma.schoolGroup.findUnique({
        where: { id: groupId },
        });

        if (!group) {
        throw new NotFoundException('Turma não encontrada.');
        }

        const students = await this.prisma.student.findMany({
        where: { 
            groupId: groupId,
            active: true
        },
        orderBy: {
            name: 'asc',
        },
        });

        return students;
    }

    async findAll() {
        return this.prisma.schoolGroup.findMany({
            orderBy: { name: 'asc' },
            select: {
            id: true,
            name: true,
            schedule: true,
            },
        });
    }
}