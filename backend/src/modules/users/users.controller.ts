import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { User } from './entities/user.entity.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@ApiTags('admin/users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão (exige ADMINISTRADOR)' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Cria uma conta',
    description:
      'Senha inicial gerada automaticamente (RN015): 3 primeiras letras do nome em minúsculas + data de nascimento DDMMAAAA. Ex: "Rodrigo Silva", 2002-05-15 → rod15052002.',
  })
  @ApiCreatedResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Corpo inválido ou ATLETA_MAIOR com menos de 18 anos (RN008)' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: 'Lista todas as contas' })
  @ApiOkResponse({ type: User, isArray: true })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Busca uma conta por id' })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'id não é um UUID' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Atualiza dados da conta (todos os campos opcionais)' })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Corpo inválido, id não UUID ou violação da RN008' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Ativa a conta' })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'id não é um UUID' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, true);
  }

  @ApiOperation({ summary: 'Inativa a conta (login passa a retornar 401)' })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'id não é um UUID' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, false);
  }

  @ApiOperation({ summary: 'Redefine a senha de um usuário (RF003)' })
  @ApiOkResponse({ description: 'Senha redefinida (sem corpo)' })
  @ApiBadRequestResponse({ description: 'Nova senha com menos de 6 caracteres ou id não UUID' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Patch(':id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }
}
