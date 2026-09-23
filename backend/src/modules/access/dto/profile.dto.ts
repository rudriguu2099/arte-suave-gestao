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
  @IsString() @Length(2, 160) name: string;

  @ApiProperty({ example: '15/05/2002', description: 'DD/MM/AAAA; também gera a senha inicial (RN015)' })
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'birthDate deve usar DD/MM/AAAA.',
  })
  birthDate: string;

  @ApiProperty({ enum: profileRoles, description: "'admin' exige superadmin" })
  @IsIn(profileRoles) role: ProfileRole;

  @ApiProperty({
    type: [String],
    maxItems: 10,
    example: ['rodrigo@example.com'],
    description: 'O primeiro vira o login. Obrigatório, exceto para atleta menor de idade.',
  })
  @IsArray() @ArrayMaxSize(10) @IsEmail({}, { each: true }) emails: string[];

  @ApiProperty({ type: [String], maxItems: 10, example: ['88999990000'], description: 'Com DDD, 10 a 13 dígitos' })
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) phones: string[];

  @ApiPropertyOptional({ example: 'adult', description: 'Turma; obrigatória para atleta' })
  @IsOptional() @IsString() @Length(1, 80) groupId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Responsável ativo; obrigatório para atleta menor de idade' })
  @IsOptional() @IsUUID() guardianId?: string;
}

// PATCH: só o que mudar; o resto é completado com os dados atuais.
export class UpdateProfileDto extends PartialType(ProfileDto) {}
