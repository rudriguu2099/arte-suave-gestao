import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AdminFooter } from "../components/access";
import { Back, Button, colors, ErrorMessage, Heading, Page, styles } from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isSuperAdmin } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import {
  expenseCategoryLabel,
  financeApi,
  paymentMethodLabel,
  revenueCategoryLabel,
  type FinanceEntryItem,
  type FinanceSummaryResponse,
} from "../services/finance";
import { formatarReais } from "../utils/validators";

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

const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const palette = {
  green: "#059669",
  chartGreen: "#00C814",
  red: "#E02424",
  amber: "#D97706",
  paidBg: "#E6F7EF",
  paidBorder: "#A7F3D0",
  pendingBg: "#FEF3C7",
  pendingBorder: "#FCD34D",
  pendingText: "#B45309",
  pillTrack: "#EAEAEA",
};

type FilterTab = "revenues" | "all" | "expenses" | "pending";

function createInitialHistory(month: number, year: number) {
  return Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(year, month - 6 + idx, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), revenues: 0, expenses: 0, balance: 0 };
  });
}

function entrySubtitle(entry: FinanceEntryItem): string {
  const parts: string[] = [];
  if (entry.description.trim()) parts.push(entry.description.trim());
  if (entry.kind === "revenue") {
    if (entry.student?.name) parts.push(`Atleta: ${entry.student.name}`);
    if (entry.donor) parts.push(`Doador: ${entry.donor}`);
    if (!entry.student?.name && entry.beneficiary) parts.push(`Beneficiado: ${entry.beneficiary}`);
    parts.push(entry.date);
    parts.push(paymentMethodLabel(entry.paymentMethod).toLowerCase());
  } else {
    parts.push(entry.date);
  }
  return parts.join(" · ");
}

// HU019 / RF016: painel mensal de finanças com totais, despesas pendentes, gráficos de barras e lançamentos do período.
export default function FinanceScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Finance">) {
  const { current, getToken, signOut } = useAccess();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [filter, setFilter] = useState<FilterTab>("all");
  const [data, setData] = useState<FinanceSummaryResponse>(() => ({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    totals: { revenues: 0, expenses: 0, paidExpenses: 0, pendingExpenses: 0, pendingCount: 0, balance: 0 },
    history: createInitialHistory(now.getMonth() + 1, now.getFullYear()),
    expensesByCategory: [],
    pendingExpenses: [],
    entries: [],
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await financeApi.getSummary(getToken(), month, year);
      setData(response);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut();
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getToken, month, year, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return navigation.addListener("focus", () => {
      void load();
    });
  }, [navigation, load]);

  if (!isSuperAdmin(current)) return null;

  function changeMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  }

  function referenceDate(): string {
    const today = new Date();
    const day =
      today.getFullYear() === year && today.getMonth() + 1 === month
        ? String(today.getDate()).padStart(2, "0")
        : "05";
    return `${day}/${String(month).padStart(2, "0")}/${year}`;
  }

  const maxHistory = Math.max(...data.history.flatMap((point) => [point.revenues, point.expenses]), 1);
  const maxAbsBalance = Math.max(...data.history.map((point) => Math.abs(point.balance)), 1);
  const maxCategoryExpense = Math.max(...data.expensesByCategory.map((item) => item.total), 1);

  const filteredEntries = data.entries.filter((entry) => {
    if (filter === "revenues") return entry.kind === "revenue";
    if (filter === "expenses") return entry.kind === "expense";
    if (filter === "pending") return entry.kind === "expense" && entry.status === "PENDENTE";
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "revenues", label: "Receitas" },
    { key: "all", label: "Todos" },
    { key: "expenses", label: "Despesas" },
    {
      key: "pending",
      label: data.totals.pendingCount > 0 ? `Pendentes (${data.totals.pendingCount})` : "Pendentes",
    },
  ];

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Finance" />}>
      {/* Bloco superior branco do painel (seguindo o mockup) */}
      <View
        style={{
          marginHorizontal: -24,
          marginTop: -24,
          padding: 24,
          gap: 18,
          backgroundColor: colors.paper,
          borderBottomWidth: 1,
          borderColor: "#E5E5E5",
        }}
      >
        <Back onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))} />
        <Heading title="FINANÇAS" />

        {/* Seletor de mês/ano */}
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            hitSlop={10}
            onPress={() => changeMonth(-1)}
            style={{ padding: 4 }}
          >
            <MaterialIcons name="chevron-left" size={22} color={colors.ink} />
          </Pressable>
          <Text style={[styles.text, { fontWeight: "700", fontSize: 16 }]}>
            {monthNames[month - 1]} {year}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            hitSlop={10}
            onPress={() => changeMonth(1)}
            style={{ padding: 4 }}
          >
            <MaterialIcons name="chevron-right" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <ErrorMessage message={error} />

        {/* Cards de resumo do período: Receitas, Despesas (com pendentes) e Saldo */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={[styles.card, { flex: 1, minWidth: 96, padding: 12, gap: 6 }]}>
            <Text style={[styles.label, { color: colors.muted, fontSize: 9 }]}>RECEITAS</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: palette.green }}>
              {formatarReais(data.totals.revenues)}
            </Text>
          </View>

          <View style={[styles.card, { flex: 1, minWidth: 96, padding: 12, gap: 4 }]}>
            <Text style={[styles.label, { color: colors.muted, fontSize: 9 }]}>DESPESAS</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: palette.red }}>
              {formatarReais(data.totals.expenses)}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: data.totals.pendingCount > 0 ? palette.pendingText : colors.muted,
                fontWeight: data.totals.pendingCount > 0 ? "700" : "400",
              }}
            >
              {data.totals.pendingCount > 0
                ? `Pend.: ${formatarReais(data.totals.pendingExpenses)} (${data.totals.pendingCount})`
                : "Sem pendências"}
            </Text>
          </View>

          <View style={[styles.card, { flex: 1, minWidth: 96, padding: 12, gap: 6 }]}>
            <Text style={[styles.label, { color: colors.muted, fontSize: 9 }]}>SALDO</Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: data.totals.balance < 0 ? palette.red : palette.green,
              }}
            >
              {formatarReais(data.totals.balance)}
            </Text>
          </View>
        </View>

        {/* Gráfico 1 (Mockup): Histórico 6 Meses — Receita vs Despesa */}
        <View style={[styles.card, { padding: 16, gap: 14 }]}>
          <Text style={[styles.label, { color: colors.muted, fontWeight: "700" }]}>HISTÓRICO 6 MESES</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-around",
              height: 112,
              paddingTop: 8,
              borderBottomWidth: 1,
              borderColor: "#EFEFEF",
            }}
          >
            {data.history.map((point) => {
              const expHeight =
                point.expenses > 0 ? Math.max(5, Math.round((point.expenses / maxHistory) * 96)) : 2;
              const revHeight =
                point.revenues > 0 ? Math.max(5, Math.round((point.revenues / maxHistory) * 96)) : 2;
              return (
                <View
                  key={`${point.year}-${point.month}`}
                  accessibilityLabel={`${shortMonths[point.month - 1]} ${point.year}: receitas ${formatarReais(point.revenues)}, despesas ${formatarReais(point.expenses)}`}
                  style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
                    <View
                      style={{
                        width: 11,
                        height: expHeight,
                        backgroundColor: palette.red,
                        borderTopLeftRadius: 2,
                        borderTopRightRadius: 2,
                        opacity: point.expenses > 0 ? 1 : 0.25,
                      }}
                    />
                    <View
                      style={{
                        width: 11,
                        height: revHeight,
                        backgroundColor: palette.chartGreen,
                        borderTopLeftRadius: 2,
                        borderTopRightRadius: 2,
                        opacity: point.revenues > 0 ? 1 : 0.25,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: -8 }}>
            {data.history.map((point) => {
              const selected = point.month === month && point.year === year;
              return (
                <Text
                  key={`lbl-${point.year}-${point.month}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 10,
                    color: selected ? colors.ink : colors.muted,
                    fontWeight: selected ? "700" : "400",
                  }}
                >
                  {shortMonths[point.month - 1]}
                </Text>
              );
            })}
          </View>
          <View style={[styles.row, { gap: 18 }]}>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={{ width: 8, height: 8, backgroundColor: palette.chartGreen }} />
              <Text style={[styles.muted, { fontSize: 11 }]}>Receita</Text>
            </View>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={{ width: 8, height: 8, backgroundColor: palette.red }} />
              <Text style={[styles.muted, { fontSize: 11 }]}>Despesa</Text>
            </View>
          </View>
        </View>

        {/* Gráfico 2 (RF016): Gráfico de Barras do Saldo Mensal (6 Meses) */}
        <View style={[styles.card, { padding: 16, gap: 10 }]}>
          <Text style={[styles.label, { color: colors.muted, fontWeight: "700" }]}>SALDO — 6 MESES</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {data.history.map((point) => {
              const barHeight =
                point.balance !== 0
                  ? Math.max(5, Math.round((Math.abs(point.balance) / maxAbsBalance) * 44))
                  : 2;
              const positive = point.balance > 0;
              const negative = point.balance < 0;
              const selected = point.month === month && point.year === year;
              return (
                <View
                  key={`bal-${point.year}-${point.month}`}
                  accessibilityLabel={`Saldo ${shortMonths[point.month - 1]} ${point.year}: ${formatarReais(point.balance)}`}
                  style={{ flex: 1, alignItems: "center" }}
                >
                  <View style={{ height: 46, justifyContent: "flex-end", alignItems: "center", width: "100%" }}>
                    {positive && (
                      <View
                        style={{
                          width: 18,
                          height: barHeight,
                          backgroundColor: palette.chartGreen,
                          borderTopLeftRadius: 2,
                          borderTopRightRadius: 2,
                        }}
                      />
                    )}
                    {point.balance === 0 && (
                      <View style={{ width: 18, height: 2, backgroundColor: colors.border }} />
                    )}
                  </View>
                  <View style={{ height: 1, width: "100%", backgroundColor: "#DDDDDD" }} />
                  <View style={{ height: 46, justifyContent: "flex-start", alignItems: "center", width: "100%" }}>
                    {negative && (
                      <View
                        style={{
                          width: 18,
                          height: barHeight,
                          backgroundColor: palette.red,
                          borderBottomLeftRadius: 2,
                          borderBottomRightRadius: 2,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 10,
                      color: selected ? colors.ink : colors.muted,
                      fontWeight: selected ? "700" : "400",
                    }}
                  >
                    {shortMonths[point.month - 1]}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.row, { gap: 18 }]}>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={{ width: 8, height: 8, backgroundColor: palette.chartGreen }} />
              <Text style={[styles.muted, { fontSize: 11 }]}>Superávit (+)</Text>
            </View>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={{ width: 8, height: 8, backgroundColor: palette.red }} />
              <Text style={[styles.muted, { fontSize: 11 }]}>Déficit (-)</Text>
            </View>
          </View>
        </View>

        {/* Gráfico 3 (RF016): Gráfico de Barras de Despesas do Mês por Categoria e Situação */}
        <View style={[styles.card, { padding: 16, gap: 12 }]}>
          <Text style={[styles.label, { color: colors.muted, fontWeight: "700" }]}>
            DESPESAS DO MÊS POR CATEGORIA
          </Text>
          {data.expensesByCategory.length ? (
            <>
              <View style={{ gap: 10 }}>
                {data.expensesByCategory.map((item) => {
                  const paidPct = (item.paid / maxCategoryExpense) * 100;
                  const pendingPct = (item.pending / maxCategoryExpense) * 100;
                  return (
                    <View
                      key={item.category}
                      accessibilityLabel={`${expenseCategoryLabel(item.category)}: total ${formatarReais(item.total)}, pagas ${formatarReais(item.paid)}, pendentes ${formatarReais(item.pending)}`}
                      style={{ gap: 4 }}
                    >
                      <View style={[styles.row, { justifyContent: "space-between" }]}>
                        <Text style={[styles.text, { fontSize: 12, fontWeight: "600", flex: 1 }]}>
                          {expenseCategoryLabel(item.category)}
                        </Text>
                        <Text style={[styles.muted, { fontSize: 12, color: colors.ink, fontWeight: "700" }]}>
                          {formatarReais(item.total)}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 10,
                          backgroundColor: "#F3F3F3",
                          borderRadius: 2,
                          overflow: "hidden",
                          flexDirection: "row",
                        }}
                      >
                        {paidPct > 0 && (
                          <View style={{ width: `${paidPct}%`, backgroundColor: palette.red, height: "100%" }} />
                        )}
                        {pendingPct > 0 && (
                          <View style={{ width: `${pendingPct}%`, backgroundColor: palette.amber, height: "100%" }} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={[styles.row, { gap: 18 }]}>
                <View style={[styles.row, { gap: 6 }]}>
                  <View style={{ width: 8, height: 8, backgroundColor: palette.red }} />
                  <Text style={[styles.muted, { fontSize: 11 }]}>Paga ({formatarReais(data.totals.paidExpenses)})</Text>
                </View>
                <View style={[styles.row, { gap: 6 }]}>
                  <View style={{ width: 8, height: 8, backgroundColor: palette.amber }} />
                  <Text style={[styles.muted, { fontSize: 11 }]}>
                    Pendente ({formatarReais(data.totals.pendingExpenses)})
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>Nenhuma despesa registrada em {monthNames[month - 1]}.</Text>
          )}
        </View>
      </View>

      {/* Botões de ação (seção inferior cinza conforme mockup) */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title="AJUDA CUSTO" secondary onPress={() => navigation.navigate("CostAid")} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="+ LANÇAMENTO"
            onPress={() => navigation.navigate("FinanceEntry", { date: referenceDate() })}
          />
        </View>
      </View>

      {/* Cabeçalho e filtro segmentado de lançamentos do período */}
      <View style={{ gap: 12 }}>
        <View style={[styles.wrap, { justifyContent: "space-between", gap: 10 }]}>
          <Text style={[styles.heading, { fontSize: 18 }]}>Últimos Lançamentos</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              backgroundColor: palette.pillTrack,
              borderRadius: 18,
              padding: 3,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 2,
            }}
          >
            {tabs.map((tab) => {
              const active = filter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(tab.key)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                    backgroundColor: active ? colors.paper : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: active ? "700" : "500",
                      color: active ? colors.ink : colors.muted,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Lista de cards de lançamentos do mês selecionado */}
        {loading ? (
          <Text style={styles.muted}>Carregando...</Text>
        ) : filteredEntries.length ? (
          <View style={{ gap: 10 }}>
            {filteredEntries.map((entry) => {
              const isRevenue = entry.kind === "revenue";
              const titleText = isRevenue
                ? revenueCategoryLabel(entry.category, entry.title)
                : expenseCategoryLabel(entry.category, entry.title);
              const signedValue = formatarReais(isRevenue ? entry.amount : -entry.amount, true);
              const isPaid = !isRevenue && entry.status === "PAGA";

              return (
                <View key={`${entry.kind}-${entry.id}`} style={[styles.card, { padding: 14, gap: 6 }]}>
                  <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
                    <View style={[styles.wrap, { flex: 1 }]}>
                      <Text style={[styles.text, { fontWeight: "700", fontSize: 15 }]}>{titleText}</Text>
                      {!isRevenue && (
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 3,
                            borderWidth: 1,
                            backgroundColor: isPaid ? palette.paidBg : palette.pendingBg,
                            borderColor: isPaid ? palette.paidBorder : palette.pendingBorder,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "800",
                              letterSpacing: 0.6,
                              color: isPaid ? palette.green : palette.pendingText,
                            }}
                          >
                            {isPaid ? "PAGO" : "PENDENTE"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: isRevenue ? palette.green : palette.red,
                      }}
                    >
                      {signedValue}
                    </Text>
                  </View>

                  <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
                    <Text style={[styles.muted, { flex: 1, fontSize: 11 }]}>{entrySubtitle(entry)}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${titleText}`}
                      hitSlop={8}
                      onPress={() => navigation.navigate("FinanceEntry", { edit: entry })}
                      style={({ pressed }) => ({ paddingVertical: 2, paddingLeft: 8, opacity: pressed ? 0.6 : 1 })}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 0.6, color: colors.muted }}>
                        EDITAR
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.muted}>
            {filter === "pending"
              ? "Nenhuma despesa pendente neste mês."
              : filter === "revenues"
                ? "Nenhuma receita registrada neste mês."
                : filter === "expenses"
                  ? "Nenhuma despesa registrada neste mês."
                  : "Nenhum lançamento registrado neste mês."}
          </Text>
        )}
      </View>
    </Page>
  );
}
