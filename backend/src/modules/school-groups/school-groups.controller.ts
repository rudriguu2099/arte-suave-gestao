import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';

import { SchoolGroupsService } from './school-groups.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('school-groups')
@ApiBearerAuth()
@Controller('school-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolGroupsController {
    constructor(private readonly schoolGroupsService: SchoolGroupsService) {}

    @ApiOperation({ summary: 'Listar atletas de uma turma' })
    @ApiOkResponse({ description: 'Lista de atletas ativos devolvida com sucesso ordenada por nome' })
    @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
    @ApiForbiddenResponse({ description: 'Acesso negado: requer perfil de ADMINISTRADOR' })
    @ApiNotFoundResponse({ description: 'Turma não encontrada' })
    @Get(':id/students')
    @Roles('ADMINISTRADOR')
    async getStudentsByGroup(
        @Param('id') groupId: string 
    ) {
        return this.schoolGroupsService.getStudentsByGroup(groupId);
    }
}