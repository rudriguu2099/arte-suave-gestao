import { IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class ChangeGroupDto {
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  groupId: string;
}