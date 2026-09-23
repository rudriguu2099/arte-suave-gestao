import { ForbiddenException } from '@nestjs/common';
import { Role } from '../enums/role.enum.js';

// Superadmin gerencia todos; administrador gerencia apenas responsáveis e atletas; os demais, ninguém.
export function assertCanManage(
  actor: { role: Role; isSuperAdmin?: boolean },
  target: Role | undefined,
): void {
  if (actor.role !== Role.ADMINISTRADOR) {
    throw new ForbiddenException('Somente administradores podem gerenciar cadastros.');
  }
  if (target === Role.ADMINISTRADOR && actor.isSuperAdmin !== true) {
    throw new ForbiddenException('Somente o superadmin pode gerenciar administradores.');
  }
}
