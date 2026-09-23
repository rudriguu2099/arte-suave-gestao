import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { SchoolGroup } from './school-group.entity.js';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'date' }) birthDate: string;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) emails: string[];
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) phones: string[];
  @Column({ type: 'varchar' }) groupId: string;
  @ManyToOne(() => SchoolGroup, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'groupId' })
  group: SchoolGroup;
  @Column({ default: 'Branca' }) belt: string;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  attendance: boolean[];
  @Column({ default: true }) active: boolean;
  @Column({ type: 'uuid', nullable: true, unique: true }) accountId:
    string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: User | null;
  @Column({ type: 'uuid', nullable: true }) guardianId: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guardianId' })
  guardian: User | null;
}
