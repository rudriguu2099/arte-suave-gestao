import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Badge,
  Button,
  colors,
  DateField,
  Dialog,
  ErrorMessage,
  HeaderBand,
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
  type GroupAttendanceHistory,
} from "../services/attendance";
import { getStudents, type Student } from "../services/students";

const ptBR = (date: Date) => date.toLocaleDateString("pt-BR");

function studentAge(iso: string): number {
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const m = today.getMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getUTCDate())) age--;
  return age;
}

// Turmas ativas; cada uma abre a chamada do dia (HU023 / RF020).
export function AttendanceScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Attendance">) {
  const { groups, current, getToken, signOut } = useAccess();
  const [openId, setOpenId] = useState<string | null>(null);
  const [recentByGroup, setRecentByGroup] = useState<
    Record<string, GroupAttendanceHistory["attendances"]>
  >({});
  const [loadingRecent, setLoadingRecent] = useState<string | null>(null);

  const loadRecent = useCallback(
    async (groupId: string) => {
      setLoadingRecent(groupId);
      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const history = await getGroupAttendance(
          groupId,
          { from: ptBR(from), to: ptBR(now) },
          getToken(),
        );
        setRecentByGroup((prev) => ({
          ...prev,
          [groupId]: history.attendances.slice(0, 3),
        }));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) signOut();
      } finally {
        setLoadingRecent((currentId) => (currentId === groupId ? null : currentId));
      }
    },
    [getToken, signOut],
  );

  useEffect(() => {
    if (openId) void loadRecent(openId);
  }, [openId, loadRecent]);

  useEffect(() => {
    return navigation.addListener("focus", () => {
      if (openId) void loadRecent(openId);
    });
  }, [navigation, openId, loadRecent]);

  if (!isStaff(current)) return null;
  const active = groups.filter((group) => group.active);

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Attendance" />}>
      <HeaderBand>
        <Heading title="FREQUÊNCIA" />
      </HeaderBand>

      <View style={{ gap: 12 }}>
        {active.map((group) => {
          const open = openId === group.id;
          const recent = recentByGroup[group.id] ?? [];
          return (
            <Section key={group.id} style={{ gap: 14 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenId(open ? null : group.id)}
                style={[styles.row, { alignItems: "flex-start" }]}
              >
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.wrap, { gap: 6 }]}>
                    <Text style={[styles.text, { fontWeight: "800", fontSize: 16, color: colors.ink }]}>
                      {group.name}
                    </Text>
                    {!!(group.ageRange || group.level) && (
                      <Text style={styles.muted}>
                        {[group.ageRange, group.level].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <View style={styles.wrap}>
                    {group.sessions.map((session) => (
                      <View
                        key={session.weekday + session.start}
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>
                          {weekdayLabels[session.weekday]} {session.start}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <MaterialIcons
                  name={open ? "arrow-drop-up" : "arrow-drop-down"}
                  size={28}
                  color={colors.muted}
                />
              </Pressable>

              {open && (
                <View style={{ gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.divider }}>
                  <Button
                    title="+ NOVA CHAMADA HOJE"
                    onPress={() => navigation.navigate("AttendanceForm", { groupId: group.id })}
                  />

                  {loadingRecent === group.id && !recent.length ? (
                    <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start" }} />
                  ) : recent.length > 0 ? (
                    <View style={{ gap: 8 }}>
                      <Text style={styles.label}>CHAMADAS RECENTES</Text>
                      {recent.map((attendance, idx) => (
                        <Pressable
                          key={attendance.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Editar chamada de ${attendance.date}`}
                          onPress={() =>
                            navigation.navigate("AttendanceForm", {
                              groupId: group.id,
                              attendanceId: attendance.id,
                            })
                          }
                          style={({ pressed }) => [
                            styles.row,
                            {
                              justifyContent: "space-between",
                              paddingVertical: 10,
                              borderTopWidth: idx > 0 ? 1 : 0,
                              borderColor: colors.divider,
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.text, { fontWeight: "700", color: colors.ink }]}>
                            {attendance.date}
                          </Text>
                          <View style={[styles.row, { gap: 6 }]}>
                            <Badge label={`${attendance.presences} PRES.`} tone="green" />
                            <Badge
                              label={`${attendance.absences} FALT.`}
                              tone={attendance.absences > 0 ? "amber" : "gray"}
                            />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <Button
                    secondary
                    title="VER HISTÓRICO COMPLETO"
                    style={{ backgroundColor: colors.surface }}
                    onPress={() => navigation.navigate("AttendanceHistory", { groupId: group.id })}
                  />
                </View>
              )}
            </Section>
          );
        })}
      </View>

      {!active.length && (
        <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
          <Text style={styles.muted}>Nenhuma turma ativa.</Text>
        </View>
      )}
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
          const alreadyEditingThis = editingId === detail.id;
          setEditingId(detail.id);
          applyAttendanceRecords(detail);
          setError("");
          if (!alreadyEditingThis) setPendingExisting(detail);
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
        <View
          style={{
            padding: 16,
            backgroundColor: colors.paper,
            borderTopWidth: 1,
            borderColor: colors.divider,
          }}
        >
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
            ? `Já existe uma chamada lançada para ${group?.name ?? "esta turma"} em ${pendingExisting.date}. Você pode editá-la abaixo ou selecionar outra data para lançar uma nova chamada.`
            : ""
        }
        confirmLabel="ENTENDI"
        onClose={() => setPendingExisting(null)}
      />
      <Dialog
        visible={done}
        title={editingId ? "Chamada atualizada" : "Chamada registrada"}
        message={`${group?.name ?? "Turma"} · ${date}: ${athletes.length - absent.size} presença(s) e ${absent.size} falta(s).`}
        onClose={navigation.goBack}
      />

      <HeaderBand>
        <Back onPress={navigation.goBack} />
        <Heading title={editingId ? "EDITAR CHAMADA" : "NOVA CHAMADA"} subtitle={group?.name} />
        <DateField label="Data da chamada" value={date} onChange={setDate} />
      </HeaderBand>

      <ErrorMessage message={error} />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        <View style={{ gap: 10 }}>
          {athletes.map((athlete) => {
            const present = !absent.has(athlete.id);
            const wasAbsentInSaved = initialAbsent.has(athlete.id);
            const baseAbsences = Math.max(0, athlete.absenceCount - (wasAbsentInSaved ? 1 : 0));
            const displayedAbsences = baseAbsences + (present ? 0 : 1);
            const age = studentAge(athlete.birthDate);
            return (
              <View
                key={athlete.id}
                style={[styles.card, styles.row, { paddingVertical: 14, paddingHorizontal: 16 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={[styles.wrap, { gap: 6 }]}>
                    <Text style={[styles.text, { fontWeight: "700", fontSize: 15, color: colors.ink }]}>
                      {athlete.name}
                    </Text>
                    {age >= 0 && <Text style={styles.muted}>{age} anos</Text>}
                  </View>
                </View>

                <View style={{ alignItems: "flex-end", marginRight: 4 }}>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "800",
                      color: displayedAbsences >= 3 ? colors.warning : colors.muted,
                    }}
                  >
                    {displayedAbsences}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted }}>faltas</Text>
                </View>

                <Switch
                  accessibilityLabel={`${athlete.name}: ${present ? "presente" : "ausente"}`}
                  value={present}
                  onValueChange={(value) => toggle(athlete.id, value)}
                  trackColor={{ true: colors.success, false: "#DDD6EC" }}
                  thumbColor={colors.paper}
                />
              </View>
            );
          })}
          {!athletes.length && (
            <View style={[styles.card, { alignItems: "center", paddingVertical: 22 }]}>
              <Text style={styles.muted}>Nenhum atleta ativo nesta turma.</Text>
            </View>
          )}
        </View>
      )}
    </Page>
  );
}
