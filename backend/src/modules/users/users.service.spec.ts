import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findOneBy: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      findOneBy: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn(async (data) => ({ id: 'generated-id', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: repository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    const dto = {
      name: 'Rodrigo',
      email: 'rodrigo@example.com',
      birthDate: '2002-05-15',
      role: Role.ATLETA_MAIOR,
    };

    it('cria o usuário com a senha inicial da RN015 já em hash, sem expor a senha', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('password');
      const savedArg = repository.save.mock.calls[0][0];
      await expect(bcrypt.compare('rod15052002', savedArg.password)).resolves.toBe(true);
    });

    it('lança ConflictException quando o e-mail já está cadastrado', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('lança BadRequestException ao cadastrar ATLETA_MAIOR menor de 18 anos (RN008)', async () => {
      repository.findOneBy.mockResolvedValue(null);
      const minorDto = { ...dto, birthDate: new Date().getFullYear() - 10 + '-01-01' };

      await expect(service.create(minorDto)).rejects.toThrow(BadRequestException);
    });

    it('permite cadastrar RESPONSAVEL mesmo com a data de nascimento não aplicável à regra de adulto', async () => {
      repository.findOneBy.mockResolvedValue(null);
      const responsavelDto = { ...dto, role: Role.RESPONSAVEL };

      await expect(service.create(responsavelDto)).resolves.not.toThrow();
    });
  });

  describe('findOne', () => {
    it('lança NotFoundException quando o usuário não existe', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('retorna o usuário sem o campo password quando encontrado', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'u1',
        password: 'hash',
        name: 'Rodrigo',
      });

      const result = await service.findOne('u1');

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('setActive', () => {
    it('inativa uma conta existente', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u1', isActive: true, password: 'hash' });

      const result = await service.setActive('u1', false);

      expect(result.isActive).toBe(false);
    });

    it('lança NotFoundException ao tentar (in)ativar um usuário inexistente', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.setActive('missing-id', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword (auto-serviço)', () => {
    it('lança UnauthorizedException quando a senha atual está incorreta', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'u1',
        password: await bcrypt.hash('correct', 10),
      });

      await expect(
        service.changePassword('u1', { currentPassword: 'wrong', newPassword: 'new-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('atualiza a senha (em hash) quando a senha atual está correta', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'u1',
        password: await bcrypt.hash('correct', 10),
      });

      await service.changePassword('u1', {
        currentPassword: 'correct',
        newPassword: 'new-password',
      });

      const savedArg = repository.save.mock.calls[0][0];
      await expect(bcrypt.compare('new-password', savedArg.password)).resolves.toBe(true);
    });
  });

  describe('update', () => {
    it('atualiza sem birthDate no corpo mesmo com a data vinda do banco como string', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'u1',
        name: 'Old',
        role: Role.ATLETA_MAIOR,
        birthDate: '2002-05-15',
        password: 'hash',
      });

      const result = await service.update('u1', { name: 'New' });

      expect(result.name).toBe('New');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('resetPassword (RF003 - assistida pelo administrador)', () => {
    it('redefine a senha diretamente, sem exigir a senha atual', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'u1', password: 'old-hash' });

      await service.resetPassword('u1', 'new-password-123');

      const savedArg = repository.save.mock.calls[0][0];
      await expect(bcrypt.compare('new-password-123', savedArg.password)).resolves.toBe(true);
    });
  });
});
