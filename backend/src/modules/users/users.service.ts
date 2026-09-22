import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type { ChangePasswordDto } from '../auth/dto/change-password.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { generateInitialPassword } from '../../common/utils/password-generator.util.js';

const SALT_ROUNDS = 10;
const MIN_ADULT_AGE = 18;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const birthDate = new Date(dto.birthDate);
    this.assertAdultForAthleteRole(dto.role, birthDate);

    const initialPassword = generateInitialPassword(dto.name, birthDate);
    const user = this.usersRepository.create({
      ...dto,
      birthDate,
      password: await bcrypt.hash(initialPassword, SALT_ROUNDS),
    });

    const saved = await this.usersRepository.save(user);
    return this.sanitize(saved);
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find();
    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    return this.sanitize(await this.findUserOrFail(id));
  }

  
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.findUserOrFail(id);
    
    const birthDate = new Date(dto.birthDate ?? user.birthDate);
    this.assertAdultForAthleteRole(dto.role ?? user.role, birthDate);

    Object.assign(user, { ...dto, birthDate });
    return this.sanitize(await this.usersRepository.save(user));
  }

  async setActive(id: string, isActive: boolean): Promise<Omit<User, 'password'>> {
    const user = await this.findUserOrFail(id);
    user.isActive = isActive;
    return this.sanitize(await this.usersRepository.save(user));
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findUserOrFail(id);
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersRepository.save(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUserOrFail(id);
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    user.password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersRepository.save(user);
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
  
  private assertAdultForAthleteRole(role: Role, birthDate: Date): void {
    if (role !== Role.ATLETA_MAIOR) return;

    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const hasHadBirthdayThisYear =
      today.getUTCMonth() > birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() &&
        today.getUTCDate() >= birthDate.getUTCDate());
    if (!hasHadBirthdayThisYear) age--;

    if (age < MIN_ADULT_AGE) {
      throw new BadRequestException(
        'Atletas menores de 18 anos não possuem conta de acesso (RN008)',
      );
    }
  }

  private sanitize(user: User): Omit<User, 'password'> {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
