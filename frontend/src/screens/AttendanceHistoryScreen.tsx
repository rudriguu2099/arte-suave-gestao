import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Badge,
  Button,
  colors,
  DateField,
  ErrorMessage,
  HeaderBand,
  Heading,
  Page,
  Section,
  SectionLabel,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, parseBirthDate } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import {
  getGroupAttendance,
  getStudentAttendance,
  type GroupAttendanceHistory,
  type StudentAttendanceHistory,
} from "../services/attendance";

const ptBR = (date: Date) => date.toLocaleDateString("pt-BR");

function TotalCard({
  label,
  value,
  color = colors.ink,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={[styles.card, { flex: 1, paddingVertical: 16, paddingHorizontal: 14, gap: 4 }]}>
      <Text style={{ fontSize: 26, fontWeight: "900", color }}>{value}</Text>
      <Text style={[styles.label, { fontSize: 9.5 }]}>{label}</Text>
    </View>
  );
}

// HU025 / RF022: histórico de frequência do atleta (studentId) ou da turma (groupId) no período escolhido.
export default function AttendanceHistoryScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "AttendanceHistory">) {
  const { current, getToken, signOut } = useAccess();
  const { studentId, groupId } = route.params;
  const now = new Date();
  const [from, setFrom] = useState(ptBR(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(ptBR(now));
  const [student, setStudent] = useState<StudentAttendanceHistory | null>(null);
  const [group, setGroup] = useState<GroupAttendanceHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    const start = parseBirthDate(from);
    const end = parseBirthDate(to);
    if (!start || !end) return setError("Informe as datas De e Até (dd/mm/aaaa).");
    if (start > end) return setError("A data inicial não pode ser superior à data final.");
    setLoading(true);
    setError("");
    try {
      if (studentId) setStudent(await getStudentAttendance(studentId, { from, to }, getToken()));
      else if (groupId) setGroup(await getGroupAttendance(groupId, { from, to }, getToken()));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut();
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const searchRef = useRef(search);
  searchRef.current = search;

  // Abre já consultando o mês atual e atualiza ao voltar da edição de chamada (HU024).
  useEffect(() => {
    void search();
  }, [studentId, groupId]);

  useEffect(() => {
    return navigation.addListener("focus", () => {
      void searchRef.current();
    });
  }, [navigation]);

  if (!isStaff(current)) return null;

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Attendance" />}>
      <HeaderBand>
        <Back onPress={navigation.goBack} />
        <Heading
          title={studentId ? "FREQUÊNCIA" : "HISTÓRICO DE CHAMADAS"}
          subtitle={student?.student.name ?? group?.group.name}
        />

        <View style={{ gap: 10 }}>
          <Text style={styles.label}>FILTRAR POR PERÍODO</Text>
          <View style={[styles.row, { alignItems: "flex-start" }]}>
            <View style={{ flex: 1 }}>
              <DateField label="De" value={from} onChange={setFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="Até" value={to} onChange={setTo} />
            </View>
          </View>
          <ErrorMessage message={error} />
          <Button title={loading ? "CONSULTANDO..." : "CONSULTAR"} disabled={loading} onPress={search} />
        </View>

        {group && !loading && (
          <View style={styles.row}>
            <TotalCard label="CHAMADAS" value={group.totals.sessions} color={colors.ink} />
            <TotalCard label="PRESENÇAS" value={group.totals.presences} color={colors.success} />
            <TotalCard label="FALTAS" value={group.totals.absences} color={colors.error} />
          </View>
        )}

        {student && !loading && (
          <View style={styles.row}>
            <TotalCard label="PRESENÇAS" value={student.totals.presences} color={colors.success} />
            <TotalCard label="FALTAS" value={student.totals.absences} color={colors.error} />
          </View>
        )}
      </HeaderBand>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        <View style={{ gap: 12 }}>
          {group && (
            <>
              <SectionLabel title="TODAS AS CHAMADAS" />
              {group.attendances.map((attendance) => (
                <Section key={attendance.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar chamada de ${attendance.date}`}
                    onPress={() =>
                      navigation.navigate("AttendanceForm", {
                        groupId: group.group.id,
                        attendanceId: attendance.id,
                      })
                    }
                    style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.65 : 1 })}
                  >
                    <View style={[styles.row, { justifyContent: "space-between" }]}>
                      <Text style={[styles.text, { fontWeight: "800", fontSize: 16, color: colors.ink }]}>
                        {attendance.date}
                      </Text>
                      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
                    </View>
                    <View style={[styles.wrap, { gap: 8 }]}>
                      <Badge label={`${attendance.presences} PRES.`} tone="green" />
                      <Badge
                        label={`${attendance.absences} FALT.`}
                        tone={attendance.absences > 0 ? "amber" : "gray"}
                      />
                    </View>
                  </Pressable>
                </Section>
              ))}
              {!group.attendances.length && (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 20 }]}>
                  <Text style={styles.muted}>Nenhuma chamada registrada no período.</Text>
                </View>
              )}
            </>
          )}

          {student && (
            <>
              {student.records.map((record) => (
                <View
                  key={record.date + record.group.id}
                  style={[
                    styles.card,
                    styles.row,
                    {
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 16,
                      backgroundColor: record.present ? colors.paper : colors.errorBg,
                      borderColor: record.present ? colors.border : colors.errorBorder,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={record.present ? "check" : "close"}
                    size={18}
                    color={record.present ? colors.success : colors.error}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.text, { fontWeight: "700", fontSize: 15, color: colors.ink }]}>
                      {record.date}
                    </Text>
                    <Text style={[styles.muted, { fontSize: 11 }]}>{record.group.name}</Text>
                  </View>
                  <Badge
                    label={record.present ? "PRESENTE" : "AUSENTE"}
                    tone={record.present ? "green" : "red"}
                  />
                </View>
              ))}
              {!student.records.length && (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 20 }]}>
                  <Text style={styles.muted}>Nenhuma chamada registrada no período.</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </Page>
  );
}
