import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ProfileRole = 'admin' | 'responsible' | 'athlete';
export const profileRoles: ProfileRole[] = ['admin', 'responsible', 'athlete'];

export class AccessAccount {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Rodrigo Silva' }) name: string;
  @ApiProperty({ example: '15/05/2002', description: 'DD/MM/AAAA' }) birthDate: string;
  @ApiProperty({ type: [String], example: ['rodrigo@example.com'] }) emails: string[];
  @ApiProperty({ type: [String], example: ['88999990000'] }) phones: string[];
  @ApiProperty({ enum: profileRoles }) role: ProfileRole;
  @ApiProperty() active: boolean;
  @ApiProperty({ description: 'Só pode existir um. Administrador comum não gerencia contas admin.' })
  isSuperAdmin: boolean;
  @ApiProperty({
    type: [String],
    description: 'Responsável: alunos sob sua guarda. Atleta: o próprio registro de aluno.',
  })
  athleteIds: string[];
}

export class AccessStudent {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Ana Souza' }) name: string;
  @ApiProperty({ example: '10/01/2015', description: 'DD/MM/AAAA' }) birthDate: string;
  @ApiProperty({ type: [String] }) emails: string[];
  @ApiProperty({ type: [String] }) phones: string[];
  @ApiProperty({ example: 'child' }) groupId: string;
  @ApiProperty({ example: 'Branca' }) belt: string;
  @ApiProperty({ type: [Boolean] }) attendance: boolean[];
  @ApiProperty() active: boolean;
  @ApiPropertyOptional({ format: 'uuid', description: 'Conta de acesso (somente atleta maior de idade)' })
  accountId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Responsável (somente atleta menor de idade)' })
  guardianId?: string;
}

export class AccessGroup {
  @ApiProperty({ example: 'adult' }) id: string;
  @ApiProperty({ example: 'Adulto' }) name: string;
  @ApiProperty({ example: 'Seg/Qua' }) schedule: string;
}

export class AccessEvent {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() date: string;
  @ApiProperty() location: string;
  @ApiProperty({ enum: ['meeting', 'championship'] }) kind: 'meeting' | 'championship';
}

export class AccessState {
  @ApiProperty({ type: AccessAccount, description: 'Conta logada' }) current: AccessAccount;
  @ApiProperty({ type: [AccessAccount], description: 'Administradores veem todas; os demais, só a própria' })
  accounts: AccessAccount[];
  @ApiProperty({
    type: [AccessStudent],
    description: 'Administradores veem todos; responsável, os seus; atleta, o próprio',
  })
  athletes: AccessStudent[];
  @ApiProperty({ type: [AccessGroup], description: 'Administradores veem todas; os demais, só as dos seus alunos' })
  groups: AccessGroup[];
  @ApiProperty({ type: [AccessEvent], description: 'Ainda sempre vazio' }) events: AccessEvent[];
}

export class ProfileResult {
  @ApiProperty({ example: 'Rodrigo Silva' }) name: string;
  @ApiProperty({ description: 'false para atleta menor de idade (não tem conta de acesso)' })
  hasAccess: boolean;
  @ApiPropertyOptional({
    example: 'rod15052002',
    description: 'Senha inicial (RN015), retornada só quando uma conta nova é criada',
  })
  password?: string;
}

export type ProfileTarget = { kind: 'account' | 'athlete'; id: string };
