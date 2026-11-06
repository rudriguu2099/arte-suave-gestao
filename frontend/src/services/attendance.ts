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
