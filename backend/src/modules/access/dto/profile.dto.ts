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

export class ProfileDto {
  @IsString() @Length(2, 160) name: string;
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'birthDate deve usar DD/MM/AAAA.',
  })
  birthDate: string;
  @IsIn(['admin', 'responsible', 'athlete']) role:
    'admin' | 'responsible' | 'athlete';
  @IsArray() @ArrayMaxSize(10) @IsEmail({}, { each: true }) emails: string[];
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) phones: string[];
  @IsOptional() @IsString() @Length(1, 80) groupId?: string;
  @IsOptional() @IsUUID() guardianId?: string;
}
