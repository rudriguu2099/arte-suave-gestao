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
import { SuperAdminGuard } from '../../common/guards/superadmin.guard.js';
import { AccessService } from './access.service.js';
import { ProfileDto } from './dto/profile.dto.js';
import type { JwtPayload } from '../auth/auth.service.js';

@ApiTags('access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('access')
export class AccessController {
  constructor(private readonly service: AccessService) {}
  @Get('state')
  state(@Req() request: { user: JwtPayload }) {
    return this.service.state(request.user.id);
  }

  @Post('profiles')
  @UseGuards(SuperAdminGuard)
  create(@Req() request: { user: JwtPayload }, @Body() dto: ProfileDto) {
    return this.service.saveProfile(request.user.id, dto);
  }

  @Patch('profiles/account/:id')
  @UseGuards(SuperAdminGuard)
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
  @UseGuards(SuperAdminGuard)
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
  @UseGuards(SuperAdminGuard)
  toggleAccount(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(request.user.id, { kind: 'account', id });
  }

  @Post('profiles/athlete/:id/toggle-active')
  @UseGuards(SuperAdminGuard)
  toggleStudent(
    @Req() request: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(request.user.id, { kind: 'athlete', id });
  }
}
