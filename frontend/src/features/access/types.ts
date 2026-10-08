export type Role = "admin" | "responsible" | "athlete";

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  responsible: "Responsável",
  athlete: "Atleta",
};

export type Account = {
  id: string;
  name: string;
  birthDate: string;
  emails: string[];
  phones: string[];
  role: Role;
  active: boolean;
  readonly isSuperAdmin: boolean;
  athleteIds: string[];
};

export type Athlete = {
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
};

export type ProfileInput = {
  name: string;
  birthDate: string;
  emails: string[];
  phones: string[];
  role: Role;
  groupId?: string;
  guardianId?: string;
};
export type ProfileTarget =
  | { accountId: string; athleteId?: never }
  | { athleteId: string; accountId?: never };
export type ProfileState = { accounts: Account[]; athletes: Athlete[] };
export type ProfileResult = {
  name: string;
  hasAccess: boolean;
  password?: string;
};
// weekday segue o backend: 0 = domingo ... 6 = sábado.
export const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export type GroupSession = { weekday: number; start: string; end: string };
export type GroupInput = {
  name: string;
  ageRange: string;
  level: string;
  sessions: GroupSession[];
};
export type Group = GroupInput & { id: string; schedule: string; active: boolean };
export type Event = {
  id: string;
  name: string;
  date: string;
  location: string;
  kind: "meeting" | "championship";
};

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Accounts: undefined;
  AccountForm: ProfileTarget | undefined;
  Password: { accountId?: string } | undefined;
  Groups: undefined;
  GroupForm: { groupId: string } | undefined;
  Finance: undefined;
  Events: undefined;
  Students: { groupId?: string } | undefined;
  Attendance: undefined;
};
