// src/services/students.ts
import { api } from "./api";

export type Student = {
  id: string;
  name: string;
  active: boolean;
  absenceCount: number;
  birthDate: string;
  group?: { id: string; name: string };
  guardianName?: string;
};

type Filters = { groupId?: string; search?: string; active?: boolean };

export function getStudents(f: Filters, token: string) {
  const params: string[] = [];
  if (f.groupId) params.push(`groupId=${encodeURIComponent(f.groupId)}`);
  if (f.search) params.push(`search=${encodeURIComponent(f.search)}`);
  if (f.active !== undefined) params.push(`active=${f.active}`);
  const qs = params.length ? `?${params.join("&")}` : "";
  return api.get<Student[]>(`/students${qs}`, token);
}