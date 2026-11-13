import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Button,
  colors,
  DateField,
  Dialog,
  ErrorMessage,
  Heading,
  Page,
  Section,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, parseBirthDate } from "../features/access/domain";
import { weekdayLabels, type RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import {
  createAttendance,
  getAttendance,
  getGroupAttendance,
  updateAttendance,
  type AttendanceDetail,
} from "../services/attendance";
import { getStudents, type Student } from "../services/students";

// Turmas ativas; cada uma abre a chamada do dia (HU023 / RF020).
export function AttendanceScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Attendance">) {
  const { groups, current } = useAccess();
  const [openId, setOpenId] = useState<string | null>(null);
  if (!isStaff(current)) return null;
  const active = groups.filter((group) => group.active);
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Attendance" />}>
      <Heading title="FREQUÊNCIA" />
      <View style={{ gap: 10 }}>
        {active.map((group) => {
          const open = openId === group.id;
          return (
            <Section key={group.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenId(open ? null : group.id)}
                style={[styles.row, { alignItems: "flex-start" }]}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.text, { fontWeight: "700", fontSize: 16 }]}>{group.name}</Text>
                  {!!(group.ageRange || group.level) && (
                    <Text style={[styles.muted, { fontSize: 10 }]}>
                      {[group.ageRange, group.level].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                  <View style={styles.wrap}>
                    {group.sessions.map((session) => (
                      <View
                        key={session.weekday + session.start}
                        style={{ backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2 }}
                      >
                        <Text style={{ fontSize: 10, color: colors.ink }}>
                          {weekdayLabels[session.weekday]} {session.start}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <MaterialIcons name={open ? "arrow-drop-up" : "arrow-drop-down"} size={28} color={colors.ink} />
              </Pressable>
              {open && (
                <View style={{ gap: 8 }}>
                  <Button
                    title="+ NOVA CHAMADA HOJE"
                    onPress={() => navigation.navigate("AttendanceForm", { groupId: group.id })}
                  />
                  <Button
                    secondary
                    title="VER HISTÓRICO COMPLETO"
                    onPress={() => navigation.navigate("AttendanceHistory", { groupId: group.id })}
                  />
                </View>
              )}
            </Section>
          );
        })}
      </View>
      {!active.length && <Text style={styles.muted}>Nenhuma turma ativa.</Text>}
    </Page>
  );
}

// Todos começam presentes na nova chamada; na edição (HU024 / RF021), carrega a chamada anterior.
export function AttendanceFormScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "AttendanceForm">) {
  const { groups, current, getToken, signOut } = useAccess();
  const { groupId, attendanceId } = route.params;
  const group = groups.find((item) => item.id === groupId);
  const [editingId, setEditingId] = useState<string | undefined>(attendanceId);
  const [date, setDate] = useState(new Date().toLocaleDateString("pt-BR"));
  const [athletes, setAthletes] = useState<Student[]>([]);
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [initialAbsent, setInitialAbsent] = useState<Set<string>>(new Set());
  const [pendingExisting, setPendingExisting] = useState<AttendanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);
  const checkedDateRef = useRef<string>("");

  function applyAttendanceRecords(attendance: AttendanceDetail) {
    const absentSet = new Set(attendance.records.filter((r) => !r.present).map((r) => r.studentId));
    setInitialAbsent(new Set(absentSet));
    setAbsent(absentSet);
  }

  useEffect(() => {
    const token = getToken();
    setLoading(true);
    const load = attendanceId
      ? Promise.all([getStudents({ groupId, active: true }, token), getAttendance(attendanceId, token)]).then(
          ([students, attendance]) => {
            checkedDateRef.current = attendance.date;
            setEditingId(attendance.id);
            setDate(attendance.date);
            setAthletes(students);
            applyAttendanceRecords(attendance);
          },
        )
      : getStudents({ groupId, active: true }, token).then(setAthletes);

    load
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) return signOut();
        setError((e as Error).message);
      })
      .finally(() => setLoading(false));
  }, [groupId, attendanceId]);

  useEffect(() => {
    if (!parseBirthDate(date) || checkedDateRef.current === date) return;
    let cancelled = false;
    const token = getToken();
    checkedDateRef.current = date;

    getGroupAttendance(groupId, { from: date, to: date }, token)
      .then(async (history) => {
        if (cancelled) return;
        const existing = history.attendances[0];
        if (existing) {
          const detail = await getAttendance(existing.id, token);
          if (cancelled) return;
          applyAttendanceRecords(detail);
          if (editingId === detail.id) return;
          setPendingExisting(detail);
        } else if (!attendanceId) {
          setEditingId(undefined);
          setInitialAbsent(new Set());
          setAbsent(new Set());
          setPendingExisting(null);
          setError("");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) return signOut();
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, date, attendanceId, editingId]);

  if (!isStaff(current)) return null;

  function confirmEditExisting() {
    if (!pendingExisting) return;
    setEditingId(pendingExisting.id);
    applyAttendanceRecords(pendingExisting);
    setPendingExisting(null);
    setError("");
  }

  function cancelEditExisting() {
    setPendingExisting(null);
    setError("Já existe chamada desta turma nesta data. Altere a data ou edite a chamada existente.");
  }

  function toggle(id: string, present: boolean) {
    setAbsent((previous) => {
      const next = new Set(previous);
      if (present) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (submitted.current) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return setError("Informe a data da chamada.");
    submitted.current = true;
    setSaving(true);
    setError("");
    const records = athletes.map((a) => ({ studentId: a.id, present: !absent.has(a.id) }));
    try {
      if (editingId) {
        await updateAttendance(editingId, { date, records }, getToken());
      } else {
        await createAttendance({ groupId, date, records }, getToken());
      }
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut();
      setError((e as Error).message);
      submitted.current = false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page
      footer={
        <View style={{ padding: 16, backgroundColor: colors.paper }}>
          <Button
            title={saving ? "SALVANDO..." : editingId ? "ATUALIZAR CHAMADA" : "SALVAR CHAMADA"}
            disabled={saving || loading || !athletes.length}
            onPress={save}
          />
        </View>
      }
    >
      <Dialog
        visible={!!pendingExisting}
        title="Chamada já registrada"
        message={
          pendingExisting
            ? `Já existe uma chamada lançada para ${group?.name ?? "esta turma"} em ${pendingExisting.date}. Deseja editá-la?`
            : ""
        }
        confirmLabel="EDITAR CHAMADA"
        onConfirm={confirmEditExisting}
        onClose={cancelEditExisting}
      />
      <Dialog
        visible={done}
        title={editingId ? "Chamada atualizada" : "Chamada registrada"}
        message={`${group?.name ?? "Turma"} · ${date}: ${athletes.length - absent.size} presença(s) e ${absent.size} falta(s).`}
        onClose={navigation.goBack}
      />
      <Back onPress={navigation.goBack} />
      <Heading title={editingId ? "EDITAR CHAMADA" : "NOVA CHAMADA"} subtitle={group?.name} />
      <DateField label="Data da chamada" value={date} onChange={setDate} />
      <ErrorMessage message={error} />
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={{ gap: 10 }}>
          {athletes.map((athlete) => {
            const present = !absent.has(athlete.id);
            const wasAbsentInSaved = initialAbsent.has(athlete.id);
            const baseAbsences = Math.max(0, athlete.absenceCount - (wasAbsentInSaved ? 1 : 0));
            const displayedAbsences = baseAbsences + (present ? 0 : 1);
            return (
              <Section key={athlete.id}>
                <View style={styles.row}>
                  <Text style={[styles.text, { flex: 1 }]}>{athlete.name}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.text}>{displayedAbsences}</Text>
                    <Text style={[styles.muted, { fontSize: 10 }]}>faltas</Text>
                  </View>
                  <Switch
                    accessibilityLabel={`${athlete.name}: ${present ? "presente" : "ausente"}`}
                    value={present}
                    onValueChange={(value) => toggle(athlete.id, value)}
                    trackColor={{ true: "#0CC50C", false: colors.border }}
                    thumbColor={colors.paper}
                  />
                </View>
              </Section>
            );
          })}
          {!athletes.length && <Text style={styles.muted}>Nenhum atleta ativo nesta turma.</Text>}
        </View>
      )}
    </Page>
  );
}
