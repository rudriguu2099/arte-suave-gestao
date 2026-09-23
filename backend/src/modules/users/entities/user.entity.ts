import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum.js';

@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Rodrigo Silva' })
  @Column()
  name: string;

  @ApiProperty({ example: 'rodrigo@example.com' })
  @Column({ unique: true })
  email: string;
  
  @ApiHideProperty()
  @Column()
  password: string;

  @ApiProperty({ type: String, format: 'date', example: '2002-05-15' })
  @Column({ type: 'date' })
  birthDate: Date;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  @Column({ type: 'enum', enum: Role })
  role: Role;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ example: false, readOnly: true })
  @Column({ default: false })
  isSuperAdmin: boolean;

  @ApiHideProperty()
  @Column({ default: 0 })
  tokenVersion: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  contactEmails: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  phones: string[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
  
  @ApiProperty()
  @DeleteDateColumn()
  deletedAt: Date | null;
}
