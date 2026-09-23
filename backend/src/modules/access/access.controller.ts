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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AccessService } from './access.service.js';
import { ProfileDto } from './dto/profile.dto.js';
import type { JwtPayload } from '../auth/auth.service.js';

@ApiTags('access')
@ApiBearerAuth()
// Superadmin gerencia todos; administrador só responsáveis e atletas (regra em assertCanManage).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('access')
export class AccessController {
  constructor(private readonly service: AccessService) {}
  @Get('state')
  state(@Req() request: { user: JwtPayload }) {
    return this.service.state(request.user.id);
  }

  @Post('profiles')
  @Roles(Role.ADMINISTRADOR)
  create(@Req() request: { user: JwtPayload }, @Body() dto: ProfileDto) {
    return this.service.saveProfile(request.user.id, dto);
  }

  @Patch('profiles/account/:id')
  @Roles(Role.ADMINISTRADOR)
  updateAccount(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProfileDto,
  ) {
    return this.service.saveProfile(request.user.id, dto, {
      kind: 'account',
      id,
    });
  }

  @Patch('profiles/athlete/:id')
  @Roles(Role.ADMINISTRADOR)
  updateStudent(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProfileDto,
  ) {
    return this.service.saveProfile(request.user.id, dto, {
      kind: 'athlete',
      id,
    });
  }

  @Post('profiles/account/:id/toggle-active')
  @Roles(Role.ADMINISTRADOR)
  toggleAccount(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(request.user.id, { kind: 'account', id });
  }

  @Post('profiles/athlete/:id/toggle-active')
  @Roles(Role.ADMINISTRADOR)
  toggleStudent(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(request.user.id, { kind: 'athlete', id });
  }
}
