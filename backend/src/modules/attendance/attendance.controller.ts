import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceDto } from './dto/attendance.dto.js';

@ApiTags('attendances')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido, expirado ou conta inativa' })
@ApiForbiddenResponse({ description: 'Somente administradores fazem a chamada' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @ApiOperation({
    summary: 'Registra a chamada de uma turma (HU023 / RF020)',
    description: 'Uma chamada por turma e data. Os registros contam na chamada e na frequência individual do atleta.',
  })
  @ApiCreatedResponse({ description: 'Chamada registrada, com data em DD/MM/AAAA' })
  @ApiBadRequestResponse({ description: 'Dados inválidos, data futura ou atleta fora da turma/inativo' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @ApiConflictResponse({ description: 'Já existe chamada desta turma nesta data' })
  @Post()
  create(@Body() dto: AttendanceDto) {
    return this.service.create(dto);
  }
}
