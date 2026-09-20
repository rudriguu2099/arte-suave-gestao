import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import { Role } from '../enums/role.enum.js';

describe('RolesGuard', () => {
  function createContext(user?: { role: Role }): ExecutionContext {
    return {
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function createGuard(requiredRoles: Role[] | undefined): RolesGuard {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('permite acesso quando a rota não exige nenhum perfil específico', () => {
    const guard = createGuard(undefined);
    expect(guard.canActivate(createContext({ role: Role.ATLETA_MAIOR }))).toBe(true);
  });

  it('permite acesso quando o perfil do usuário está entre os exigidos', () => {
    const guard = createGuard([Role.ADMINISTRADOR]);
    expect(guard.canActivate(createContext({ role: Role.ADMINISTRADOR }))).toBe(true);
  });

  it('nega acesso (permissão negada) quando o perfil do usuário não é o exigido', () => {
    const guard = createGuard([Role.ADMINISTRADOR]);
    expect(() => guard.canActivate(createContext({ role: Role.RESPONSAVEL }))).toThrow(
      ForbiddenException,
    );
  });

  it('nega acesso quando não há usuário autenticado no request', () => {
    const guard = createGuard([Role.ADMINISTRADOR]);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
  });
});
