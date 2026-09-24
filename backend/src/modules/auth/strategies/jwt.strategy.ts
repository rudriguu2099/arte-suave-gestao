import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../auth.service.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? 'changeme',
    });
  }

  /** O retorno vira `request.user`, consumido pelo RolesGuard. */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findForAuthentication(payload.id);
    if (!user?.isActive || (user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Sessão expirada ou conta inativa. Entre novamente.');
    }
    return { id: user.id, email: user.email, role: user.role, isSuperAdmin: user.isSuperAdmin === true, tokenVersion: user.tokenVersion };
  }
}
