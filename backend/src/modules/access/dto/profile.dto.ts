import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { profileRoles, type ProfileRole } from '../access.contract.js';

export class ProfileDto {
  @ApiProperty({ example: 'Rodrigo Silva', minLength: 2, maxLength: 160 })
  @IsString({ message: 'name deve ser um texto.' })
  @Length(2, 160, { message: 'name deve ter entre 2 e 160 caracteres.' })
  name: string;

  @ApiProperty({ example: '15/05/2002', description: 'DD/MM/AAAA; também gera a senha inicial' })
  @IsString({ message: 'Data de Nascimento deve ser um texto.' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'Data de Nascimento deve usar DD/MM/AAAA.',
  })
  birthDate: string;

  @ApiProperty({ enum: profileRoles, description: "'admin' exige superadmin" })
  @IsIn(profileRoles, { message: 'role deve ser um dos valores permitidos.' })
  role: ProfileRole;

  @ApiProperty({
    type: [String],
    maxItems: 10,
    example: ['rodrigo@example.com'],
    description: 'O primeiro vira o login. Obrigatório, exceto para atleta menor de idade.',
  })
  @IsArray({ message: 'emails deve ser uma lista.' })
  @ArrayMaxSize(10, { message: 'emails deve ter no máximo 10 itens.' })
  @IsEmail({}, { each: true, message: 'cada e-mail informado deve ser válido.' })
  emails: string[];

  @ApiProperty({ type: [String], maxItems: 10, example: ['88999990000'], description: 'Com DDD, 10 a 13 dígitos' })
  @IsArray({ message: 'Telefones deve ser uma lista.' })
  @ArrayMaxSize(10, { message: 'Telefones deve ter no máximo 10 itens.' })
  @IsString({ each: true, message: 'cada telefone deve ser um texto.' })
  phones: string[];

  @ApiPropertyOptional({ example: 'adult', description: 'Turma; obrigatória para atleta' })
  @IsOptional()
  @IsString({ message: 'groupId deve ser um texto.' })
  @Length(1, 80, { message: 'groupId deve ter entre 1 e 80 caracteres.' })
  groupId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Responsável ativo; obrigatório para atleta menor de idade' })
  @IsOptional()
  @IsUUID(undefined, { message: 'guardianId deve ser um UUID válido.' })
  guardianId?: string;
}

// PATCH: só o que mudar; o resto é completado com os dados atuais.
export class UpdateProfileDto extends PartialType(ProfileDto) {}
