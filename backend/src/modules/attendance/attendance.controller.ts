import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceDto, AttendanceHistoryQueryDto, AttendanceQueryDto, UpdateAttendanceDto } from './dto/attendance.dto.js';

@ApiTags('attendances')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido, expirado ou conta inativa' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @ApiOperation({
    summary: 'Consulta a própria frequência ou a dos dependentes vinculados no mês (HU026 / HU027 / RF023)',
    description:
      'Atleta Maior de Idade consulta apenas a própria frequência; Responsável consulta a frequência de cada um dos seus atletas menores vinculados, vedada a consulta de outros atletas.',
  })
  @ApiOkResponse({ description: 'Frequência mensal dos atletas vinculados ao usuário logado' })
  @ApiBadRequestResponse({ description: 'Parâmetros de mês/ano ou studentId inválidos' })
  @ApiForbiddenResponse({ description: 'Tentativa de consultar atleta não vinculado ao perfil logado (RF023)' })
  @Get('me')
  @Roles(Role.ATLETA_MAIOR, Role.RESPONSAVEL, Role.ADMINISTRADOR)
  findMine(@Req() request: { user: JwtPayload }, @Query() query: AttendanceQueryDto) {
    return this.service.findMine(request.user.id, query);
  }

  @ApiOperation({
    summary: 'Registra a chamada de uma turma (HU023 / RF020)',
    description: 'Uma chamada por turma e data. Os registros contam na chamada e na frequência individual do atleta.',
  })
  @ApiCreatedResponse({ description: 'Chamada registrada, com data em DD/MM/AAAA' })
  @ApiBadRequestResponse({ description: 'Dados inválidos, data futura ou atleta fora da turma/inativo' })
  @ApiForbiddenResponse({ description: 'Somente administradores fazem a chamada' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @ApiConflictResponse({ description: 'Já existe chamada desta turma nesta data' })
  @Post()
  @Roles(Role.ADMINISTRADOR)
  create(@Body() dto: AttendanceDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Histórico de frequência do atleta no período (HU025 / RF022)',
    description: 'Total de presenças e faltas e a lista de chamadas do atleta, mais recentes primeiro. O período (from/to) é obrigatório e inclusivo.',
  })
  @ApiOkResponse({ description: 'Totais de presenças e faltas e as chamadas do período, com datas em DD/MM/AAAA' })
  @ApiBadRequestResponse({ description: 'Id inválido, data inválida ou data inicial superior à final' })
  @ApiForbiddenResponse({ description: 'Somente administradores acessam o histórico por atleta' })
  @ApiNotFoundResponse({ description: 'Atleta não encontrado' })
  @Get('students/:id')
  @Roles(Role.ADMINISTRADOR)
  historyByStudent(@Param('id', ParseUUIDPipe) studentId: string, @Query() query: AttendanceHistoryQueryDto) {
    return this.service.historyByStudent(studentId, query);
  }

  @ApiOperation({
    summary: 'Histórico de frequência da turma no período (HU025 / RF022)',
    description: 'Quantidade de chamadas, totais da turma e presenças e faltas de cada atleta que participou das chamadas. O período (from/to) é obrigatório e inclusivo.',
  })
  @ApiOkResponse({ description: 'Totais da turma e presenças e faltas por atleta, em ordem alfabética' })
  @ApiBadRequestResponse({ description: 'Data inválida ou data inicial superior à final' })
  @ApiForbiddenResponse({ description: 'Somente administradores acessam o histórico por turma' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @Get('groups/:groupId')
  @Roles(Role.ADMINISTRADOR)
  historyByGroup(@Param('groupId') groupId: string, @Query() query: AttendanceHistoryQueryDto) {
    return this.service.historyByGroup(groupId, query);
  }

  @ApiOperation({ summary: 'Consulta uma chamada pelo id para edição (HU024 / RF021)' })
  @ApiParam({ name: 'id', description: 'id da chamada' })
  @ApiOkResponse({ description: 'Chamada com data em DD/MM/AAAA e registros de presença por atleta' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiForbiddenResponse({ description: 'Somente administradores consultam a chamada' })
  @ApiNotFoundResponse({ description: 'Chamada não encontrada' })
  @Get(':id')
  @Roles(Role.ADMINISTRADOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Corrige o registro de presença de uma chamada anterior (HU024 / RF021)',
    description: 'Substitui os registros de presença da chamada e atualiza a frequência dos atletas.',
  })
  @ApiParam({ name: 'id', description: 'id da chamada' })
  @ApiOkResponse({ description: 'Chamada atualizada, com data em DD/MM/AAAA' })
  @ApiBadRequestResponse({ description: 'Dados inválidos, data futura ou atleta fora da turma/inativo' })
  @ApiForbiddenResponse({ description: 'Somente administradores editam a chamada' })
  @ApiNotFoundResponse({ description: 'Chamada não encontrada' })
  @ApiConflictResponse({ description: 'Já existe chamada desta turma nesta data' })
  @Patch(':id')
  @Roles(Role.ADMINISTRADOR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceDto) {
    return this.service.update(id, dto);
  }
}
