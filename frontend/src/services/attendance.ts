import { api } from "./api";

// date em DD/MM/AAAA; um registro por atleta ativo da turma (HU023 / RF020).
export type AttendanceInput = {
  groupId: string;
  date: string;
  records: { studentId: string; present: boolean }[];
};

export function createAttendance(input: AttendanceInput, token: string) {
  return api.post<{ id: string }>("/attendances", input, token);
}

// HU025 / RF022: período obrigatório em DD/MM/AAAA; o "to" é inclusivo.
export type AttendancePeriod = { from: string; to: string };

type Ref = { id: string; name: string };

export type StudentAttendanceHistory = {
  student: Ref;
  period: AttendancePeriod;
  totals: { presences: number; absences: number; total: number };
  records: { date: string; present: boolean; group: Ref }[];
};

export type GroupAttendanceHistory = {
  group: Ref;
  period: AttendancePeriod;
  totals: { sessions: number; presences: number; absences: number };
  attendances: { id: string; date: string; presences: number; absences: number }[];
  athletes: { id: string; name: string; presences: number; absences: number }[];
};

export function getStudentAttendance(studentId: string, period: AttendancePeriod, token: string) {
  return api.get<StudentAttendanceHistory>(`/attendances/students/${studentId}?${new URLSearchParams(period)}`, token);
}

export function getGroupAttendance(groupId: string, period: AttendancePeriod, token: string) {
  return api.get<GroupAttendanceHistory>(
    `/attendances/groups/${encodeURIComponent(groupId)}?${new URLSearchParams(period)}`,
    token,
  );
}
