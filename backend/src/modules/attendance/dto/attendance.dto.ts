import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsNotEmpty, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';

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
