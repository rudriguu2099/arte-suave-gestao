import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Badge,
  Button,
  Check,
  ErrorMessage,
  Field,
  HeaderBand,
  Page,
  Section,
  SectionLabel,
  colors,
  styles,
} from "../components/ui";
import {
  AdminFooter,
  BrandAvatar,
  NotificationCards,
  UserFooter,
  type UserTab,
} from "../components/access";
import { useAccess } from "../features/access/AccessContext";
import { ageOn, isStaff, isSuperAdmin } from "../features/access/domain";
import { roleLabels, type RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import { getMyAttendance, type AthleteMonthlyAttendance } from "../services/attendance";
import {
  expenseCategoryLabel,
  financeApi,
  type FinanceExpenseEntry,
} from "../services/finance";
import { LIMITE_SENHA, formatarReais } from "../utils/validators";

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
  const { current, signOut, athletes, accounts, groups, events, syncError, getToken, changePassword } =
    useAccess();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<Record<string, AthleteMonthlyAttendance>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [pendingExpenses, setPendingExpenses] = useState<FinanceExpenseEntry[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Abas do perfil Responsável / Atleta (Frequência, Notificações, Perfil)
  const [userTab, setUserTab] = useState<UserTab>("attendance");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

  // Busca TODAS as despesas pendentes em aberto (independente do mês).
  const loadPendingExpenses = useCallback(async () => {
    if (!current || !superadmin) return;
    setLoadingPending(true);
    try {
      const response = await financeApi.listHistory(getToken(), { type: "expense" });
      const pending = response.entries.filter(
        (entry): entry is FinanceExpenseEntry =>
          entry.kind === "expense" && entry.status === "PENDENTE",
      );
      setPendingExpenses(pending);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOut();
    } finally {
      setLoadingPending(false);
    }
  }, [current, getToken, signOut, superadmin]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    void loadPendingExpenses();
  }, [loadPendingExpenses]);

  useEffect(() => {
    return navigation.addListener("focus", () => {
      void loadPendingExpenses();
      void loadAttendance();
    });
  }, [navigation, loadPendingExpenses, loadAttendance]);

  if (!current) return null;

  function changeMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  }

  async function handleProfilePasswordChange() {
    if (!current || savingPassword) return;
    setSavingPassword(true);
    setPasswordError("");
    try {
      await changePassword(current.id, newPassword, confirmPassword, currentPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError((e as Error).message);
    } finally {
      setSavingPassword(false);
    }
  }

  const isCurrentMonth = month === currentMonth && year === currentYear;
  const isResponsible = current.role === "responsible";

  const stats: {
    value: number;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    tintBg: string;
    tintColor: string;
  }[] = [
    {
      value: athletes.filter((item) => item.active).length,
      label: "ATLETAS ATIVOS",
      icon: "people-outline",
      tintBg: colors.primarySoft,
      tintColor: colors.primary,
    },
    {
      value: groups.filter((item) => item.active).length,
      label: "TURMAS ATIVAS",
      icon: "calendar-today",
      tintBg: colors.pinkSoft,
      tintColor: colors.pink,
    },
    {
      value: accounts.length,
      label: "CONTAS",
      icon: "badge",
      tintBg: colors.primarySoft,
      tintColor: colors.primary,
    },
    {
      value: accounts.reduce((total, account) => total + account.athleteIds.length, 0),
      label: "VÍNCULOS",
      icon: "link",
      tintBg: colors.pinkSoft,
      tintColor: colors.pink,
    },
  ];

  const managementTiles: {
    title: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      title: "Contas de acesso",
      icon: "person-outline",
      onPress: () => navigation.navigate("Accounts"),
    },
    {
      title: "Responsáveis",
      icon: "people-outline",
      onPress: () => navigation.navigate("Responsibles"),
    },
    {
      title: "Turmas",
      icon: "calendar-today",
      onPress: () => navigation.navigate("Groups"),
    },
  ];

  return (
    <Page
      footer={
        admin ? (
          <AdminFooter navigation={navigation} active="Home" />
        ) : (
          <UserFooter active={userTab} onSelect={setUserTab} notificationCount={events.length} />
        )
      }
    >
      <HeaderBand style={{ paddingVertical: 16 }}>
        <View style={[styles.row, { gap: 12 }]}>
          <BrandAvatar size={46} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.label, { fontSize: 10 }]}>
              {superadmin ? "ADMINISTRADOR" : roleLabels[current.role].toUpperCase()}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.text, { fontWeight: "800", fontSize: 16, color: colors.ink }]}
            >
              {current.name}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da sessão"
            onPress={signOut}
            hitSlop={10}
            style={({ pressed }) => ({
              minHeight: 38,
              paddingHorizontal: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1, color: colors.muted }}>
              SAIR
            </Text>
          </Pressable>
        </View>
      </HeaderBand>

      <ErrorMessage message={syncError || attendanceError} />

      {admin ? (
        <>
          {/* Grade 2x2 de métricas com textos sempre em uma única linha */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {stats.map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.card,
                  styles.row,
                  {
                    width: "47%",
                    flexGrow: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    gap: 10,
                  },
                ]}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: stat.tintBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name={stat.icon} size={19} color={stat.tintColor} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={{
                      fontSize: 22,
                      fontWeight: "900",
                      color: colors.ink,
                      lineHeight: 26,
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    style={{
                      fontSize: 9.5,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                      color: colors.muted,
                    }}
                  >
                    {stat.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Todas as Despesas Pendentes */}
          {superadmin && (
            <View style={{ gap: 10 }}>
              <SectionLabel title="DESPESAS PENDENTES" />
              {loadingPending && !pendingExpenses.length ? (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 16 }]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : pendingExpenses.length > 0 ? (
                pendingExpenses.map((expense) => (
                  <Pressable
                    key={expense.id}
                    accessibilityRole="button"
                    onPress={() => navigation.navigate("FinanceEntry", { edit: expense })}
                    style={({ pressed }) => [
                      styles.card,
                      styles.row,
                      {
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        justifyContent: "space-between",
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.text, { fontWeight: "600", color: colors.ink }]}
                      >
                        {expense.description.trim() ||
                          expenseCategoryLabel(expense.category, expense.title)}
                      </Text>
                      <Text numberOfLines={1} style={[styles.muted, { fontSize: 11 }]}>
                        {expenseCategoryLabel(expense.category, expense.title)} · {expense.date}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.error }}>
                      {formatarReais(expense.amount)}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 16 }]}>
                  <Text style={styles.muted}>Nenhuma despesa pendente.</Text>
                </View>
              )}
            </View>
          )}

          {/* Gestão: apenas Contas de acesso, Responsáveis e Turmas */}
          <View style={{ gap: 10 }}>
            <SectionLabel title="GESTÃO" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {managementTiles.map((tile) => (
                <Pressable
                  key={tile.title}
                  accessibilityRole="button"
                  onPress={tile.onPress}
                  style={({ pressed }) => [
                    styles.card,
                    styles.row,
                    {
                      width: "47%",
                      flexGrow: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      gap: 10,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name={tile.icon} size={18} color={colors.primary} />
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[
                      styles.text,
                      { flex: 1, fontSize: 13, fontWeight: "600", color: colors.ink },
                    ]}
                  >
                    {tile.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : userTab === "notifications" ? (
        <View style={{ gap: 12 }}>
          <SectionLabel dash title="NOTIFICAÇÕES" />
          <NotificationCards />
        </View>
      ) : userTab === "profile" ? (
        <View style={{ gap: 16 }}>
          <View style={[styles.card, { paddingVertical: 16, paddingHorizontal: 18, gap: 4 }]}>
            <Text style={[styles.text, { fontSize: 17, fontWeight: "800", color: colors.ink }]}>
              {current.name}
            </Text>
            {!!current.emails[0] && (
              <Text style={styles.muted}>{current.emails[0]}</Text>
            )}
          </View>

          <Section>
            <SectionLabel dash title="ALTERAR SENHA" />
            <Field
              label="Senha atual"
              placeholder="••••••"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              maxLength={LIMITE_SENHA}
              secureTextEntry={!showPasswords}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            <Field
              label="Nova senha"
              placeholder="••••••"
              value={newPassword}
              onChangeText={setNewPassword}
              maxLength={LIMITE_SENHA}
              secureTextEntry={!showPasswords}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <Field
              label="Confirmar nova senha"
              placeholder="••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              maxLength={LIMITE_SENHA}
              secureTextEntry={!showPasswords}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <Text style={styles.muted}>
              Use de 6 a 16 caracteres, com maiúscula, minúscula, número e símbolo.
            </Text>
            <Check label="Mostrar senhas" value={showPasswords} onChange={setShowPasswords} />
            <ErrorMessage message={passwordError} />
            <Button
              title={savingPassword ? "SALVANDO..." : "ALTERAR SENHA"}
              disabled={savingPassword}
              onPress={handleProfilePasswordChange}
            />
          </Section>
        </View>
      ) : athletes.length ? (
        <View style={{ gap: 16 }}>
          {/* Seletor de mês */}
          <View
            style={[
              styles.card,
              styles.row,
              {
                justifyContent: "space-between",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 16,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              hitSlop={10}
              onPress={() => changeMonth(-1)}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="chevron-left" size={22} color={colors.muted} />
            </Pressable>
            <Text style={[styles.text, { fontWeight: "700", fontSize: 15, color: colors.ink }]}>
              {monthNames[month - 1]} {year}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              hitSlop={10}
              onPress={() => changeMonth(1)}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
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
            const presentCount =
              fetched?.presentCount ?? attendanceList.filter(Boolean).length;
            const absentCount =
              fetched?.absentCount ?? attendanceList.filter((item) => !item).length;
            const groupSubtitle = [group?.name, group?.level].filter(Boolean).join(" · ");

            const athleteContent = (
              <>
                {/* Cabeçalho do dependente / turma */}
                <View style={{ gap: 4 }}>
                  <View style={[styles.wrap, { gap: 8, justifyContent: "space-between" }]}>
                    <View style={[styles.wrap, { gap: 8, flex: 1 }]}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>
                        {isResponsible ? athlete.name : (group?.name ?? "Sem turma")}
                      </Text>
                      {isResponsible && (
                        <Badge
                          label={`${absentCount} ${absentCount === 1 ? "FALTA" : "FALTAS"}`}
                          tone={absentCount >= 3 ? "amber" : "gray"}
                        />
                      )}
                    </View>
                  </View>
                  <Text style={styles.muted}>
                    {isResponsible
                      ? [groupSubtitle || "Sem turma", group?.schedule]
                          .filter(Boolean)
                          .join(" · ")
                      : `${ageOn(athlete.birthDate)} anos · Faixa ${athlete.belt.toLowerCase()}${group?.schedule ? ` · ${group.schedule}` : ""}`}
                  </Text>
                </View>

                {isResponsible && (
                  <View style={{ height: 1, backgroundColor: colors.divider }} />
                )}

                {/* KPIs Presenças / Faltas */}
                <View style={styles.row}>
                  <View
                    style={[
                      isResponsible
                        ? {
                            flex: 1,
                            backgroundColor: colors.successBg,
                            borderColor: colors.successBorder,
                            borderWidth: 1,
                            borderRadius: 14,
                            paddingVertical: 14,
                            paddingHorizontal: 14,
                            gap: 2,
                          }
                        : [styles.card, { flex: 1, paddingVertical: 18, gap: 4 }],
                    ]}
                  >
                    <Text style={{ fontSize: 26, fontWeight: "900", color: colors.success }}>
                      {presentCount}
                    </Text>
                    <Text style={styles.label}>PRESENÇAS</Text>
                  </View>
                  <View
                    style={[
                      isResponsible
                        ? {
                            flex: 1,
                            backgroundColor: colors.errorBg,
                            borderColor: colors.errorBorder,
                            borderWidth: 1,
                            borderRadius: 14,
                            paddingVertical: 14,
                            paddingHorizontal: 14,
                            gap: 2,
                          }
                        : [styles.card, { flex: 1, paddingVertical: 18, gap: 4 }],
                    ]}
                  >
                    <Text style={{ fontSize: 26, fontWeight: "900", color: colors.error }}>
                      {absentCount}
                    </Text>
                    <Text style={styles.label}>FALTAS</Text>
                  </View>
                </View>

                <SectionLabel dash title="HISTÓRICO" />

                {loadingAttendance && !fetched ? (
                  <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start" }} />
                ) : records.length ? (
                  <View style={{ gap: 8 }}>
                    {records.map((record, index) => (
                      <View
                        key={`${athlete.id}-${record.date}-${index}`}
                        accessibilityLabel={`Treino ${record.date}: ${record.present ? "presente" : "ausente"}`}
                        style={[
                          styles.row,
                          {
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 14,
                            borderWidth: 1,
                            backgroundColor: record.present
                              ? isResponsible
                                ? colors.surface
                                : colors.paper
                              : colors.errorBg,
                            borderColor: record.present ? colors.border : colors.errorBorder,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={record.present ? "check" : "close"}
                          size={18}
                          color={record.present ? colors.success : colors.error}
                        />
                        <Text
                          style={[
                            styles.text,
                            { fontWeight: "700", fontSize: 15, color: colors.ink, marginRight: 6 },
                          ]}
                        >
                          {record.date}
                        </Text>
                        <Badge
                          label={record.present ? "PRESENTE" : "AUSENTE"}
                          tone={record.present ? "green" : "red"}
                        />
                      </View>
                    ))}
                  </View>
                ) : attendanceList.length ? (
                  <View style={{ gap: 8 }}>
                    {attendanceList.map((present, index) => (
                      <View
                        key={index}
                        accessibilityLabel={`Treino ${index + 1}: ${present ? "realizado" : "não realizado"}`}
                        style={[
                          styles.row,
                          {
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 14,
                            borderWidth: 1,
                            backgroundColor: present
                              ? isResponsible
                                ? colors.surface
                                : colors.paper
                              : colors.errorBg,
                            borderColor: present ? colors.border : colors.errorBorder,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={present ? "check" : "close"}
                          size={18}
                          color={present ? colors.success : colors.error}
                        />
                        <Text style={[styles.text, { fontWeight: "700", color: colors.ink, marginRight: 6 }]}>
                          Treino {index + 1}
                        </Text>
                        <Badge
                          label={present ? "PRESENTE" : "AUSENTE"}
                          tone={present ? "green" : "red"}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: isResponsible ? colors.surface : colors.paper,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 14,
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={styles.muted}>
                      Nenhuma frequência registrada em {monthNames[month - 1].toLowerCase()}.
                    </Text>
                  </View>
                )}
              </>
            );

            return isResponsible ? (
              <View
                key={athlete.id}
                style={[
                  styles.card,
                  {
                    borderRadius: 22,
                    borderColor: colors.primaryBorder,
                    padding: 16,
                    gap: 12,
                  },
                ]}
              >
                {athleteContent}
              </View>
            ) : (
              <View key={athlete.id} style={{ gap: 12 }}>
                {athleteContent}
              </View>
            );
          })}
        </View>
      ) : (
        <Section>
          <Text style={[styles.text, { fontWeight: "700" }]}>Nenhum atleta vinculado à sua conta.</Text>
          <Text style={styles.muted}>Solicite o vínculo à gestão do projeto.</Text>
        </Section>
      )}
    </Page>
  );
}
