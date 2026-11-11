import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AttendanceRecordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID() studentId: string;

  @ApiProperty({ example: true })
  @IsBoolean() present: boolean;
}

export class AttendanceDto {
  @ApiProperty({ description: 'id da turma', maxLength: 80 })
  @IsString() @IsNotEmpty() @MaxLength(80) groupId: string;

  @ApiProperty({ example: '20/10/2026', description: 'DD/MM/AAAA' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'date deve usar DD/MM/AAAA.' }) date: string;

  @ApiProperty({ type: [AttendanceRecordDto], description: 'Um registro por atleta ativo da turma' })
  @IsArray() @ArrayNotEmpty() @ArrayUnique((record: AttendanceRecordDto) => record.studentId, { message: 'Atleta repetido na chamada.' })
  @ValidateNested({ each: true }) @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}

export class AttendanceQueryDto {
  @ApiPropertyOptional({ example: 9, minimum: 1, maximum: 12, description: 'Mês de referência (1 a 12). Padrão: mês atual.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;

  @ApiPropertyOptional({ example: 2026, minimum: 2000, maximum: 2100, description: 'Ano de referência. Padrão: ano atual.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por um atleta específico vinculado ao usuário logado.' })
  @IsOptional() @IsUUID() studentId?: string;
}

export class AttendanceHistoryQueryDto {
  @ApiProperty({ example: '01/10/2026', description: 'Início do período (DD/MM/AAAA)' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'from deve usar DD/MM/AAAA.' })
  from: string;

  @ApiProperty({ example: '31/10/2026', description: 'Fim do período, inclusivo (DD/MM/AAAA)' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'to deve usar DD/MM/AAAA.' })
  to: string;
}
