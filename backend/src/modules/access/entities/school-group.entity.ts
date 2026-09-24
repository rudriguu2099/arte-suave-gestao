import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('school_groups')
export class SchoolGroup {
  @PrimaryColumn({ type: 'varchar', length: 80 }) id: string;
  @Column() name: string;
  @Column() schedule: string;
}
