import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';

export class CreateUserDto {
  @ApiProperty({ example: 'Rodrigo Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rodrigo@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '2002-05-15', description: 'Data ISO (AAAA-MM-DD); gera a senha inicial (RN015)' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.ATLETA_MAIOR })
  @IsEnum(Role)
  role: Role;
}
