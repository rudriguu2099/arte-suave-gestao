import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Action, ErrorMessage, colors, Page, Section, styles } from "../components/ui";
import { AdminFooter, EventCards } from "../components/access";
import { useAccess } from "../features/access/AccessContext";
import { ageOn, isStaff, isSuperAdmin } from "../features/access/domain";
import { roleLabels, type RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import { getMyAttendance, type AthleteMonthlyAttendance } from "../services/attendance";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">) {
  const { current, signOut, athletes, accounts, groups, syncError, getToken } = useAccess();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<Record<string, AthleteMonthlyAttendance>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const admin = isStaff(current);
  const superadmin = isSuperAdmin(current);

  const loadAttendance = useCallback(async () => {
    if (!current || admin || !athletes.length) return;
    setLoadingAttendance(true);
    setAttendanceError("");
    try {
      const response = await getMyAttendance(getToken(), { month, year });
      const map: Record<string, AthleteMonthlyAttendance> = {};
      for (const item of response.athletes) {
        map[item.studentId] = item;
      }
      setMonthlyData(map);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        signOut();
        return;
      }
      setAttendanceError((e as Error).message);
    } finally {
      setLoadingAttendance(false);
    }
  }, [admin, athletes.length, current, getToken, month, signOut, year]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  if (!current) return null;

  function changeMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  }

  const isCurrentMonth = month === currentMonth && year === currentYear;

  return (
    <Page
      footer={
        admin ? (
          <AdminFooter navigation={navigation} active="Home" />
        ) : undefined
      }
    >
      <View
        style={[
          styles.row,
          {
            marginHorizontal: -24,
            marginTop: -24,
            padding: 22,
            backgroundColor: colors.paper,
            borderBottomWidth: 1,
            borderColor: "#E5E5E5",
          },
        ]}
      >
        <View
          accessibilityLabel="Arte Suave"
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 2,
            borderColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 18 }}>AS</Text>
          <Text style={{ fontSize: 5, letterSpacing: 0.5 }}>ARTE SUAVE</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.muted }]}>
            {superadmin ? "Superadmin" : roleLabels[current.role]}
          </Text>
          <Text style={[styles.text, { fontWeight: "700" }]}>
            {current.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da sessão"
          onPress={signOut}
          style={{
            minWidth: 44,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <Text style={[styles.label, { textDecorationLine: "underline" }]}>
            SAIR
          </Text>
          <MaterialIcons name="logout" size={15} color={colors.ink} />
        </Pressable>
      </View>
      <ErrorMessage message={syncError || attendanceError} />
      {admin ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            {
              value: athletes.filter((item) => item.active).length,
              label: "Atletas ativos",
            },
            { value: groups.length, label: "Turmas" },
            ...(admin
              ? [
                  { value: accounts.length, label: "Contas" },
                  {
                    value: accounts.reduce(
                      (total, account) => total + account.athleteIds.length,
                      0,
                    ),
                    label: "Vínculos",
                  },
                ]
              : []),
          ].map((stat) => (
            <View
              key={stat.label}
              style={[styles.card, { width: "47%", flexGrow: 1, gap: 2 }]}
            >
              <Text style={[styles.heading, { fontSize: 32 }]}>
                {stat.value}
              </Text>
              <Text style={[styles.label, { color: colors.muted }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      ) : athletes.length ? (
        <>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              hitSlop={10}
              onPress={() => changeMonth(-1)}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="chevron-left" size={20} color={colors.ink} />
            </Pressable>
            <Text style={[styles.text, { fontWeight: "700" }]}>
              {monthNames[month - 1]} {year}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              hitSlop={10}
              onPress={() => changeMonth(1)}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="chevron-right" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {athletes.map((athlete) => {
            const group = groups.find((item) => item.id === athlete.groupId);
            const fetched = monthlyData[athlete.id];
            const attendanceList = fetched
              ? fetched.attendance
              : isCurrentMonth
                ? athlete.attendance
                : [];
            const records = fetched?.records ?? [];
            const groupSubtitle = [group?.name, group?.level]
              .filter(Boolean)
              .join(" ");

            return (
              <Section key={athlete.id}>
                <Text
                  style={[styles.label, { textDecorationLine: "underline" }]}
                >
                  {current.role === "athlete"
                    ? "MINHA TURMA"
                    : "DEPENDENTE VINCULADO"}
                </Text>
                <Text
                  style={[styles.text, { fontWeight: "700", fontSize: 16 }]}
                >
                  {current.role === "athlete"
                    ? (group?.name ?? "Sem turma")
                    : athlete.name}
                </Text>
                <Text style={styles.muted}>
                  {current.role === "athlete"
                    ? `${ageOn(athlete.birthDate)} anos - Faixa ${athlete.belt.toLowerCase()}${group?.schedule ? ` - ${group.schedule}` : ""}`
                    : [groupSubtitle || "Sem turma", group?.schedule]
                        .filter(Boolean)
                        .join(" - ")}
                </Text>
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#E5E5E5",
                    marginVertical: 4,
                  }}
                />
                <Text
                  style={[styles.label, { textDecorationLine: "underline" }]}
                >
                  {current.role === "athlete"
                    ? `MINHA FREQUÊNCIA DE ${monthNames[month - 1]}`
                    : `FREQUÊNCIA DO DEPENDENTE - ${monthNames[month - 1]}`}
                </Text>
                {loadingAttendance && !fetched ? (
                  <ActivityIndicator color={colors.ink} style={{ alignSelf: "flex-start" }} />
                ) : attendanceList.length ? (
                  <>
                    <View style={[styles.wrap, { maxWidth: 310 }]}>
                      {attendanceList.map((present, index) => {
                        const dateLabel = records[index]?.date;
                        return (
                          <View
                            key={index}
                            accessibilityLabel={`Treino ${index + 1}${dateLabel ? ` (${dateLabel})` : ""}: ${present ? "realizado" : "não realizado"}`}
                            style={{
                              width: 26,
                              height: 26,
                              backgroundColor: present ? "#111111" : colors.paper,
                              borderWidth: 1,
                              borderColor: "#E4E4E4",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ color: "white", fontSize: 10 }}>
                              {present ? index + 1 : ""}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.muted}>
                      {attendanceList.filter(Boolean).length}/
                      {attendanceList.length} Treinos realizados
                    </Text>
                  </>
                ) : (
                  <Text style={styles.muted}>
                    Nenhuma frequência registrada em {monthNames[month - 1].toLowerCase()}.
                  </Text>
                )}
              </Section>
            );
          })}
        </>
      ) : (
        <Section>
          <Text style={styles.text}>Nenhum atleta vinculado à sua conta.</Text>
          <Text style={styles.muted}>
            Solicite o vínculo à gestão do projeto.
          </Text>
        </Section>
      )}
      <View style={{ gap: 14 }}>
        <Text
          style={[
            styles.label,
            { fontSize: 14, textDecorationLine: "underline" },
          ]}
        >
          PRÓXIMOS EVENTOS
        </Text>
        <EventCards />
      </View>
      {admin && (
        <Text
          style={[
            styles.label,
            { fontSize: 14, textDecorationLine: "underline" },
          ]}
        >
          AÇÕES RÁPIDAS
        </Text>
      )}
      <View style={{ gap: 12 }}>
        {admin && (
          <>
            {admin && (
              <Action
                title="Gerenciar contas e perfis"
                onPress={() => navigation.navigate("Accounts")}
              />
            )}
            <Action
              title="Consultar alunos"
              onPress={() => navigation.navigate("Students")}
            />
            <Action
              title="Consultar turmas"
              onPress={() => navigation.navigate("Groups")}
            />
            <Action
              title="Consultar frequência"
              onPress={() => navigation.navigate("Attendance")}
            />
          </>
        )}
        <Action
          title={admin ? "Alterar minha senha" : "Redefinir senha"}
          onPress={() => navigation.navigate("Password")}
        />
      </View>
    </Page>
  );
}
