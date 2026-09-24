import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { Role } from '../../common/enums/role.enum.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  let activeUser: {
    id: string;
    name: string;
    email: string;
    password: string;
    role: Role;
    isActive: boolean;
    birthDate: Date;
  };

  beforeEach(async () => {
    activeUser = {
      id: 'user-1',
      name: 'Rodrigo',
      email: 'rodrigo@example.com',
      password: await bcrypt.hash('correct-password', 10),
      role: Role.ATLETA_MAIOR,
      isActive: true,
      birthDate: new Date('2002-05-15'),
    };

    usersService = {
      findByEmail: vi.fn(),
      changePassword: vi.fn(),
    };
    jwtService = {
      sign: vi.fn().mockReturnValue('signed-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('retorna um accessToken com id, email e role assinados no payload', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);

      const result = await service.login({
        email: activeUser.email,
        password: 'correct-password',
      });

      expect(result).toEqual({ accessToken: 'signed-jwt-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
        isSuperAdmin: false,
        tokenVersion: 0,
      });
    });

    it('lança UnauthorizedException quando o e-mail não existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'any-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando a senha está incorreta', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);

      await expect(
        service.login({ email: activeUser.email, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando a conta está inativa (isActive: false)', async () => {
      usersService.findByEmail.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(
        service.login({ email: activeUser.email, password: 'correct-password' }),
      ).rejects.toThrow(new UnauthorizedException('Conta inativa'));
    });

    it('não gera token quando a conta está inativa', async () => {
      usersService.findByEmail.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(
        service.login({ email: activeUser.email, password: 'correct-password' }),
      ).rejects.toThrow();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('delega a troca de senha (RF005) para o UsersService', async () => {
      const dto = { currentPassword: 'old-password', newPassword: 'new-password' };
      usersService.changePassword.mockResolvedValue(undefined);

      await service.changePassword(activeUser.id, dto);

      expect(usersService.changePassword).toHaveBeenCalledWith(activeUser.id, dto);
    });
  });
});
