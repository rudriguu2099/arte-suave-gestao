import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

export class GroupSessionDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6, description: '0 = domingo ... 6 = sábado' })
  @IsInt() @Min(0) @Max(6) weekday: number;

  @ApiProperty({ example: '18:00', description: 'HH:MM' })
  @Matches(HOUR, { message: 'start deve usar HH:MM.' }) start: string;

  @ApiProperty({ example: '19:30', description: 'HH:MM, depois de start' })
  @Matches(HOUR, { message: 'end deve usar HH:MM.' }) end: string;
}

export class GroupDto {
  @ApiProperty({ example: 'Kids', minLength: 2, maxLength: 80 })
  @IsString() @Length(2, 80) name: string;

  @ApiProperty({ example: '4 a 12 anos', description: 'Faixa etária (critério de agrupamento)' })
  @IsString() @Length(1, 80) ageRange: string;

  @ApiProperty({ example: 'Iniciante', description: 'Nível técnico (critério de agrupamento)' })
  @IsString() @Length(1, 80) level: string;

  @ApiProperty({ type: [GroupSessionDto], minItems: 1, maxItems: 14, description: 'Dias e horários de treino da semana' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um dia de treino.' })
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => GroupSessionDto)
  sessions: GroupSessionDto[];
}

// PATCH: só o que mudar.
export class UpdateGroupDto extends PartialType(GroupDto) {}
