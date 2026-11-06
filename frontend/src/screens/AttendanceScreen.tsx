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
import { isStaff } from "../features/access/domain";
import { weekdayLabels, type RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import { createAttendance } from "../services/attendance";
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
                <Button
                  title="+ NOVA CHAMADA HOJE"
                  onPress={() => navigation.navigate("AttendanceForm", { groupId: group.id })}
                />
              )}
            </Section>
          );
        })}
      </View>
      {!active.length && <Text style={styles.muted}>Nenhuma turma ativa.</Text>}
    </Page>
  );
}

//Todos começam presentes; desligar a chave marca ausente.
export function AttendanceFormScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "AttendanceForm">) {
  const { groups, current, getToken, signOut } = useAccess();
  const { groupId } = route.params;
  const group = groups.find((item) => item.id === groupId);
  const [date, setDate] = useState(new Date().toLocaleDateString("pt-BR"));
  const [athletes, setAthletes] = useState<Student[]>([]);
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);

  useEffect(() => {
    getStudents({ groupId, active: true }, getToken())
      .then(setAthletes)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) return signOut();
        setError((e as Error).message);
      })
      .finally(() => setLoading(false));
  }, [groupId]);

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
    try {
      await createAttendance(
        { groupId, date, records: athletes.map((a) => ({ studentId: a.id, present: !absent.has(a.id) })) },
        getToken(),
      );
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
            title={saving ? "SALVANDO..." : "SALVAR CHAMADA"}
            disabled={saving || loading || !athletes.length}
            onPress={save}
          />
        </View>
      }
    >
      <Dialog
        visible={done}
        title="Chamada registrada"
        message={`${group?.name ?? "Turma"} · ${date}: ${athletes.length - absent.size} presença(s) e ${absent.size} falta(s).`}
        onClose={navigation.goBack}
      />
      <Back onPress={navigation.goBack} />
      <Heading title="NOVA CHAMADA" subtitle={group?.name} />
      <DateField label="Data da chamada" value={date} onChange={setDate} />
      <ErrorMessage message={error} />
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={{ gap: 10 }}>
          {athletes.map((athlete) => {
            const present = !absent.has(athlete.id);
            return (
              <Section key={athlete.id}>
                <View style={styles.row}>
                  <Text style={[styles.text, { flex: 1 }]}>{athlete.name}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.text}>{athlete.absenceCount}</Text>
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
