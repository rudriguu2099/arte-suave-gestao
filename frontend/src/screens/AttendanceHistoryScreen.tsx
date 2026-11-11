import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import { financePalette } from "../components/finance";
import { Back, Button, colors, DateField, ErrorMessage, Heading, Page, Section, styles } from "../components/ui";
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

// Cores das etiquetas e dos totais: verde para presença, vermelho para falta (mesma paleta do financeiro).
const tones = {
  ok: { background: financePalette.paidBg, color: financePalette.green },
  bad: { background: "#FDECEC", color: financePalette.red },
};

function Pill({ text, tone }: { text: string; tone: keyof typeof tones }) {
  return (
    <View style={{ backgroundColor: tones[tone].background, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: "800", color: tones[tone].color }}>{text}</Text>
    </View>
  );
}

function Total({ label, value, color = colors.ink }: { label: string; value: number; color?: string }) {
  return (
    <View style={[styles.card, { flex: 1, gap: 2 }]}>
      <Text style={{ fontSize: 26, fontWeight: "800", color }}>{value}</Text>
      <Text style={[styles.muted, { fontSize: 10 }]}>{label}</Text>
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

  // Abre já consultando o mês atual.
  useEffect(() => {
    search();
  }, [studentId, groupId]);

  if (!isStaff(current)) return null;

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Attendance" />}>
      <Back onPress={navigation.goBack} />
      <Heading
        title={studentId ? "FREQUÊNCIA" : "HISTÓRICO DE CHAMADAS"}
        subtitle={student?.student.name ?? group?.group.name}
      />

      <Text style={[styles.label, { color: colors.muted }]}>FILTRAR POR PERÍODO</Text>
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

      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={{ gap: 10 }}>
          {group && (
            <>
              <View style={styles.row}>
                <Total label="CHAMADAS" value={group.totals.sessions} />
                <Total label="PRESENÇAS" value={group.totals.presences} color={tones.ok.color} />
                <Total label="FALTAS" value={group.totals.absences} color={tones.bad.color} />
              </View>
              <Text style={[styles.label, { color: colors.muted }]}>TODAS AS CHAMADAS</Text>
              {group.attendances.map((attendance) => (
                <Section key={attendance.id}>
                  <Text style={[styles.text, { fontWeight: "700", fontSize: 16 }]}>{attendance.date}</Text>
                  <Text style={[styles.muted, { fontSize: 11 }]}>
                    {attendance.presences + attendance.absences} atleta(s) na chamada
                  </Text>
                  <View style={styles.wrap}>
                    <Pill tone="ok" text={`${attendance.presences} PRES.`} />
                    <Pill tone="bad" text={`${attendance.absences} FALT.`} />
                  </View>
                </Section>
              ))}
              {!group.attendances.length && <Text style={styles.muted}>Nenhuma chamada registrada no período.</Text>}
            </>
          )}

          {student && (
            <>
              <View style={styles.row}>
                <Total label="PRESENÇAS" value={student.totals.presences} color={tones.ok.color} />
                <Total label="FALTAS" value={student.totals.absences} />
              </View>
              {student.records.map((record) => (
                <View
                  key={record.date + record.group.id}
                  style={[
                    styles.card,
                    styles.row,
                    { padding: 12, backgroundColor: record.present ? colors.paper : tones.bad.background },
                  ]}
                >
                  <MaterialIcons
                    name={record.present ? "check" : "close"}
                    size={18}
                    color={record.present ? tones.ok.color : tones.bad.color}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.text, { fontWeight: "700" }]}>{record.date}</Text>
                    <Text style={[styles.muted, { fontSize: 11 }]}>{record.group.name}</Text>
                  </View>
                  <Pill tone={record.present ? "ok" : "bad"} text={record.present ? "PRESENTE" : "AUSENTE"} />
                </View>
              ))}
              {!student.records.length && <Text style={styles.muted}>Nenhuma chamada registrada no período.</Text>}
            </>
          )}
        </View>
      )}
    </Page>
  );
}
