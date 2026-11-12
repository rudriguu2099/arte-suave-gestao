import { api } from "./api";

// date em DD/MM/AAAA; um registro por atleta ativo da turma (HU023 / RF020).
export type AttendanceInput = {
  groupId: string;
  date: string;
  records: { studentId: string; present: boolean }[];
};

// HU024 / RF021: consulta e edição de chamada registrada anteriormente.
export type AttendanceDetail = {
  id: string;
  groupId: string;
  date: string;
  records: { studentId: string; present: boolean }[];
};

export type UpdateAttendanceInput = {
  date?: string;
  records: { studentId: string; present: boolean }[];
};

// HU026 / HU027 / RF023: frequência mensal do próprio atleta ou de cada dependente vinculado.
export type AthleteMonthlyAttendance = {
  studentId: string;
  studentName: string;
  groupId: string;
  attendance: boolean[];
  records: { date: string; present: boolean }[];
  presentCount: number;
  absentCount: number;
  totalSessions: number;
};

export type MyAttendanceResponse = {
  month: number;
  year: number;
  athletes: AthleteMonthlyAttendance[];
};

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

export function createAttendance(input: AttendanceInput, token: string) {
  return api.post<{ id: string }>("/attendances", input, token);
}

export function getAttendance(id: string, token: string) {
  return api.get<AttendanceDetail>(`/attendances/${encodeURIComponent(id)}`, token);
}

export function updateAttendance(id: string, input: UpdateAttendanceInput, token: string) {
  return api.patch<AttendanceDetail>(`/attendances/${encodeURIComponent(id)}`, input, token);
}

export function getMyAttendance(
  token: string,
  params: { month?: number; year?: number; studentId?: string } = {},
) {
  const qs: string[] = [];
  if (params.month !== undefined) qs.push(`month=${params.month}`);
  if (params.year !== undefined) qs.push(`year=${params.year}`);
  if (params.studentId) qs.push(`studentId=${encodeURIComponent(params.studentId)}`);
  const query = qs.length ? `?${qs.join("&")}` : "";
  return api.get<MyAttendanceResponse>(`/attendances/me${query}`, token);
}

export function getStudentAttendance(studentId: string, period: AttendancePeriod, token: string) {
  return api.get<StudentAttendanceHistory>(`/attendances/students/${studentId}?${new URLSearchParams(period)}`, token);
}

export function getGroupAttendance(groupId: string, period: AttendancePeriod, token: string) {
  return api.get<GroupAttendanceHistory>(
    `/attendances/groups/${encodeURIComponent(groupId)}?${new URLSearchParams(period)}`,
    token,
  );
}
