import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/auth.service.js';

// Cadastro, edição e (in)ativação ficam em /access/profiles.
@ApiTags('admin/users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
@ApiForbiddenResponse({ description: 'Administrador só gerencia responsáveis e atletas; superadmin gerencia todos' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRADOR)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Redefine a senha de um usuário (RF003)' })
  @ApiOkResponse({ description: 'Senha redefinida (sem corpo)' })
  @ApiBadRequestResponse({ description: 'Nova senha com menos de 6 caracteres, igual à atual ou id não UUID' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Patch(':id/reset-password')
  resetPassword(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(req.user, id, dto.newPassword);
  }

  @ApiOperation({
    summary: 'Remove a conta (soft delete)',
    description: 'Os alunos sob guarda do responsável, ou o registro de aluno do atleta, são inativados junto.',
  })
  @ApiNoContentResponse({ description: 'Usuário removido' })
  @ApiBadRequestResponse({ description: 'id não é um UUID ou alvo é o superadmin' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: { user: JwtPayload }, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(req.user, id);
  }
}
