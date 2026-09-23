export type ProfileRole = 'admin' | 'responsible' | 'athlete';
export interface AccessAccount {
  id: string;
  name: string;
  birthDate: string;
  emails: string[];
  phones: string[];
  role: ProfileRole;
  active: boolean;
  isSuperAdmin: boolean;
  athleteIds: string[];
}
export interface AccessStudent {
  id: string;
  name: string;
  birthDate: string;
  emails: string[];
  phones: string[];
  groupId: string;
  belt: string;
  attendance: boolean[];
  active: boolean;
  accountId?: string;
  guardianId?: string;
}
export interface AccessState {
  current: AccessAccount;
  accounts: AccessAccount[];
  athletes: AccessStudent[];
  groups: { id: string; name: string; schedule: string }[];
  events: {
    id: string;
    name: string;
    date: string;
    location: string;
    kind: 'meeting' | 'championship';
  }[];
}
export interface ProfileResult {
  name: string;
  hasAccess: boolean;
  password?: string;
}
export type ProfileTarget = { kind: 'account' | 'athlete'; id: string };
