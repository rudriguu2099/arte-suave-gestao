import { api } from "./api";

// date em DD/MM/AAAA; um registro por atleta ativo da turma (HU023 / RF020).
export type AttendanceInput = {
  groupId: string;
  date: string;
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

export function createAttendance(input: AttendanceInput, token: string) {
  return api.post<{ id: string }>("/attendances", input, token);
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
