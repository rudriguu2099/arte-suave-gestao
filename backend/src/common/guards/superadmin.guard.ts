import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '../enums/role.enum.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role: Role; isSuperAdmin?: boolean } }>();
    if (user?.role !== Role.ADMINISTRADOR || user.isSuperAdmin !== true) {
      throw new ForbiddenException('Esta ação exige acesso de superadmin.');
    }
    return true;
  }
}
