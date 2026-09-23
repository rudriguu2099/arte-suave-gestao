import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, JwtPayload } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login por e-mail e senha (RF002)' })
  @ApiOkResponse({
    description: 'JWT para usar no botão "Authorize" do Swagger',
    schema: {
      type: 'object',
      properties: { accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Corpo inválido (e-mail mal formatado, campo vazio)' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas ou conta inativa' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Altera a própria senha (RF005)' })
  @ApiCreatedResponse({ description: 'Senha alterada (sem corpo)' })
  @ApiBadRequestResponse({ description: 'Nova senha com menos de 6 caracteres' })
  @ApiUnauthorizedResponse({ description: 'Token ausente/inválido ou senha atual incorreta' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
