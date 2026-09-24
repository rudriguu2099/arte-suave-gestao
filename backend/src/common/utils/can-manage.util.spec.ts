import { ForbiddenException } from '@nestjs/common';
import { assertCanManage } from './can-manage.util.js';
import { Role } from '../enums/role.enum.js';

describe('assertCanManage', () => {
  const superAdmin = { role: Role.ADMINISTRADOR, isSuperAdmin: true };
  const admin = { role: Role.ADMINISTRADOR, isSuperAdmin: false };

  it('superadmin gerencia todos os perfis', () => {
    for (const role of Object.values(Role)) {
      expect(() => assertCanManage(superAdmin, role)).not.toThrow();
    }
  });

  it('administrador gerencia responsáveis e atletas', () => {
    expect(() => assertCanManage(admin, Role.RESPONSAVEL)).not.toThrow();
    expect(() => assertCanManage(admin, Role.ATLETA_MAIOR)).not.toThrow();
    expect(() => assertCanManage(admin, undefined)).not.toThrow();
  });

  it('administrador não gerencia outro administrador', () => {
    expect(() => assertCanManage(admin, Role.ADMINISTRADOR)).toThrow(ForbiddenException);
  });

  it('responsáveis e atletas não gerenciam ninguém', () => {
    expect(() => assertCanManage({ role: Role.RESPONSAVEL }, Role.ATLETA_MAIOR)).toThrow(
      ForbiddenException,
    );
    expect(() => assertCanManage({ role: Role.ATLETA_MAIOR }, undefined)).toThrow(
      ForbiddenException,
    );
  });
});
