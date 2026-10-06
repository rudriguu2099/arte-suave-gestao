import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { StudentsService } from './students.service.js';
import { ChangeGroupDto } from './dto/change-group.dto.js';
import { ListStudentsQueryDto } from './dto/list-students-query.dto.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) {}

    @ApiOperation({ summary: 'Listar atletas com filtros' })
    @ApiOkResponse({
        description:
        'Lista de atletas com turma, situação e total de faltas. Filtros: groupId, search (nome), active.',
    })
    @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
    @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
    @ApiForbiddenResponse({ description: 'Requer perfil ADMINISTRADOR' })
    @Get()
    @Roles('ADMINISTRADOR')
    async findAll(@Query() query: ListStudentsQueryDto) {
        return this.studentsService.findAll(query);
    }

    @ApiOperation({ summary: 'Vincula atleta a uma turma (HU012 / RF009)' })
    @ApiOkResponse({ description: 'Atleta vinculado à turma' })
    @ApiBadRequestResponse({ description: 'groupId vazio ou maior que 80 caracteres' })
    @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
    @ApiForbiddenResponse({ description: 'Requer perfil ADMINISTRADOR' })
    @ApiNotFoundResponse({ description: 'Atleta ou turma não encontrada' })
    @Patch(':id/group')
    @Roles('ADMINISTRADOR')
    async changeGroup(
        @Param('id', ParseUUIDPipe) studentId: string,
        @Body() changeGroupDto: ChangeGroupDto,
    ) {
        return this.studentsService.changeGroup(studentId, changeGroupDto.groupId);
    }
}