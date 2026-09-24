import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { AccessService } from './access.service.js';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto.js';
import { AccessAccount, AccessState, ProfileResult } from './access.contract.js';
import type { JwtPayload } from '../auth/auth.service.js';

@ApiTags('access')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido, expirado ou conta inativa' })
// Superadmin gerencia todos; administrador só responsáveis e atletas (regra em assertCanManage).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('access')
export class AccessController {
  constructor(private readonly service: AccessService) {}
  @ApiOperation({
    summary: 'Dados da conta logada',
    description: 'Versão leve do `current` de /access/state.',
  })
  @ApiOkResponse({ type: AccessAccount })
  @Get('me')
  me(@Req() request: { user: JwtPayload }) {
    return this.service.me(request.user.id);
  }

  @ApiOperation({
    summary: 'Estado visível para a conta logada',
    description: 'Administradores veem todas as contas e alunos; responsável, só seus alunos; atleta, só o próprio registro.',
  })
  @ApiOkResponse({ type: AccessState })
  @Get('state')
  state(@Req() request: { user: JwtPayload }) {
    return this.service.state(request.user.id);
  }

  @ApiOperation({
    summary: 'Cadastra um perfil (admin, responsável ou atleta)',
    description:
      'Superadmin cadastra todos; administrador, só responsáveis e atletas. Atleta menor de idade não recebe conta de acesso e exige guardianId. Contas novas recebem a senha inicial da RN015 na resposta.',
  })
  @ApiCreatedResponse({ type: ProfileResult })
  @ApiBadRequestResponse({
    description: 'Dados inválidos: data, telefone, e-mail repetido, turma ou responsável inexistente, etc.',
  })
  @ApiForbiddenResponse({ description: 'Não é administrador, ou administrador comum mexendo em conta admin' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @Post('profiles')
  @Roles(Role.ADMINISTRADOR)
  create(@Req() request: { user: JwtPayload }, @Body() dto: ProfileDto) {
    return this.service.saveProfile(request.user.id, dto);
  }

  @ApiOperation({
    summary: 'Edita um perfil a partir da conta de acesso',
    description: 'Envie só os campos que mudam; o resto é mantido.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'id da conta (AccessAccount.id)' })
  @ApiOkResponse({ type: ProfileResult })
  @ApiBadRequestResponse({
    description: 'Dados inválidos: data, telefone, e-mail repetido, turma ou responsável inexistente, etc.',
  })
  @ApiForbiddenResponse({ description: 'Não é administrador, ou administrador comum mexendo em conta admin' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @ApiNotFoundResponse({ description: 'Conta não encontrada' })
  @Patch('profiles/account/:id')
  @Roles(Role.ADMINISTRADOR)
  updateAccount(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.updateProfile(request.user.id, dto, {
      kind: 'account',
      id,
    });
  }

  @ApiOperation({
    summary: 'Edita um perfil a partir do registro de aluno',
    description: 'Use este caminho para atletas menores, que não têm conta. Envie só os campos que mudam; o resto é mantido.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'id do aluno (AccessStudent.id)' })
  @ApiOkResponse({ type: ProfileResult })
  @ApiBadRequestResponse({
    description: 'Dados inválidos: data, telefone, e-mail repetido, turma ou responsável inexistente, etc.',
  })
  @ApiForbiddenResponse({ description: 'Não é administrador, ou administrador comum mexendo em conta admin' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @ApiNotFoundResponse({ description: 'Aluno não encontrado' })
  @Patch('profiles/athlete/:id')
  @Roles(Role.ADMINISTRADOR)
  updateStudent(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.updateProfile(request.user.id, dto, {
      kind: 'athlete',
      id,
    });
  }

  @ApiOperation({
    summary: 'Ativa/inativa uma conta',
    description: 'Inativar derruba as sessões abertas e bloqueia o login.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'id da conta' })
  @ApiCreatedResponse({ description: 'Estado alternado (sem corpo)' })
  @ApiBadRequestResponse({ description: 'id não é UUID ou alvo é o superadmin' })
  @ApiForbiddenResponse({ description: 'Não é administrador, ou administrador comum mexendo em conta admin' })
  @ApiNotFoundResponse({ description: 'Conta não encontrada' })
  @Post('profiles/account/:id/toggle-active')
  @Roles(Role.ADMINISTRADOR)
  toggleAccount(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(request.user.id, { kind: 'account', id });
  }

  @ApiOperation({
    summary: 'Ativa/inativa um aluno',
    description: 'Se o aluno tiver conta de acesso, a conta é que é alternada.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'id do aluno' })
  @ApiCreatedResponse({ description: 'Estado alternado (sem corpo)' })
  @ApiBadRequestResponse({ description: 'id não é UUID ou alvo é o superadmin' })
  @ApiForbiddenResponse({ description: 'Não é administrador, ou administrador comum mexendo em conta admin' })
  @ApiNotFoundResponse({ description: 'Aluno não encontrado' })
  @Post('profiles/athlete/:id/toggle-active')
  @Roles(Role.ADMINISTRADOR)
  toggleStudent(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(request.user.id, { kind: 'athlete', id });
  }
}
