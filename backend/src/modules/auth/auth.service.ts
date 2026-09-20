import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { Role } from '../../common/enums/role.enum.js';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciais inválidas');

    if (!user.isActive) throw new UnauthorizedException('Conta inativa');

    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }
  
  changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(userId, dto);
  }
}
