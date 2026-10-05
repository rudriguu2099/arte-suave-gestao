import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AccessGroup } from '../access/access.contract.js';
import { GroupsService } from './groups.service.js';
import { GroupDto, UpdateGroupDto } from './dto/group.dto.js';

// Listagem: as turmas já vêm em GET /access/state (administrador vê todas, inclusive inativas).
@ApiTags('groups')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido, expirado ou conta inativa' })
@ApiForbiddenResponse({ description: 'Somente administradores gerenciam turmas' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @ApiOperation({ summary: 'Cria uma turma (RF008)' })
  @ApiCreatedResponse({ type: AccessGroup })
  @ApiBadRequestResponse({ description: 'Dados inválidos: nome, critério, dia da semana ou horário' })
  @Post()
  create(@Body() dto: GroupDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Edita uma turma (RF008)',
    description: 'Envie só os campos que mudam; o resto é mantido. sessions, se enviado, substitui a lista inteira.',
  })
  @ApiParam({ name: 'id', description: 'id da turma (AccessGroup.id)' })
  @ApiOkResponse({ type: AccessGroup })
  @ApiBadRequestResponse({ description: 'Dados inválidos: nome, critério, dia da semana ou horário' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Ativa/inativa uma turma (RF008)',
    description: 'Turma inativa não recebe novos alunos. Só é possível inativar sem alunos ativos.',
  })
  @ApiParam({ name: 'id', description: 'id da turma' })
  @ApiCreatedResponse({ description: 'Estado alternado (sem corpo)' })
  @ApiBadRequestResponse({ description: 'A turma ainda tem alunos ativos' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @Post(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.service.toggleActive(id);
  }
}
