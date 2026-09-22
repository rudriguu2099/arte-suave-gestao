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
export type Group = { id: string; name: string; schedule: string };
export type Event = {
  id: string;
  name: string;
  date: string;
  location: string;
  kind: "meeting" | "championship";
};

export type RootStackParamList = {
  Home: undefined;
  Accounts: undefined;
  AccountForm: ProfileTarget | undefined;
  Password: { accountId?: string } | undefined;
  Groups: undefined;
  Finance: undefined;
  Events: undefined;
  Students: undefined;
  Attendance: undefined;
};
