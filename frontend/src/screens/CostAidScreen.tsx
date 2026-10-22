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
import { financeApi, type CostAidResponse } from "../services/finance";

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

// HU017: relação mensal de atletas que contribuíram e pendentes na ajuda de custo.
export default function CostAidScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "CostAid">) {
  const { current, getToken, signOut } = useAccess();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<CostAidResponse>({ month, year, contributed: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await financeApi.listCostAid(getToken(), month, year);
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

  // Data sugerida ao abrir o lançamento a partir do mês visualizado (hoje se for o mês atual, ou dia 05 conforme RN003).
  function referenceDate(): string {
    const today = new Date();
    const day =
      today.getFullYear() === year && today.getMonth() + 1 === month
        ? String(today.getDate()).padStart(2, "0")
        : "05";
    return `${day}/${String(month).padStart(2, "0")}/${year}`;
  }

  function openCostAidEntry(studentId?: string) {
    navigation.navigate("FinanceEntry", {
      category: "AJUDA_DE_CUSTO",
      studentId,
      amount: "30,00",
      date: referenceDate(),
    });
  }

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Finance" />}>
      <Back onPress={navigation.goBack} />
      <Heading title="AJUDA DE CUSTO" />

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

      <View style={styles.row}>
        <View style={[styles.card, styles.row, { flex: 1, justifyContent: "space-between", padding: 14 }]}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.heading, { fontSize: 20 }]}>{data.contributed.length}</Text>
            <Text style={[styles.label, { color: colors.muted, fontSize: 9 }]}>CONTRIBUÍRAM</Text>
          </View>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor: "#0CC50C",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="north-east" size={16} color={colors.paper} />
          </View>
        </View>

        <View style={[styles.card, styles.row, { flex: 1, justifyContent: "space-between", padding: 14 }]}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.heading, { fontSize: 20 }]}>{data.pending.length}</Text>
            <Text style={[styles.label, { color: colors.muted, fontSize: 9 }]}>PENDENTES</Text>
          </View>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor: "#D80000",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="south-west" size={16} color={colors.paper} />
          </View>
        </View>
      </View>

      <ErrorMessage message={error} />

      <View style={{ gap: 10 }}>
        <Text style={[styles.label, { color: colors.muted, fontWeight: "700" }]}>PENDENTES</Text>
        {loading ? (
          <Text style={styles.muted}>Carregando...</Text>
        ) : data.pending.length ? (
          data.pending.map((student) => (
            <Pressable
              key={student.id}
              accessibilityRole="button"
              accessibilityLabel={`Registrar ajuda de custo de ${student.name}`}
              onPress={() => openCostAidEntry(student.id)}
              style={({ pressed }) => [
                styles.card,
                styles.row,
                {
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.text, { fontWeight: "600", flex: 1 }]}>{student.name}</Text>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  backgroundColor: "#D80000",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="close" size={18} color={colors.paper} />
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.muted}>Nenhum atleta pendente neste mês.</Text>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={[styles.label, { color: colors.muted, fontWeight: "700" }]}>CONTRIBUÍRAM</Text>
        {loading ? (
          <Text style={styles.muted}>Carregando...</Text>
        ) : data.contributed.length ? (
          data.contributed.map((student) => (
            <View
              key={student.id}
              style={[
                styles.card,
                styles.row,
                { justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
              ]}
            >
              <Text style={[styles.text, { fontWeight: "600", flex: 1 }]}>{student.name}</Text>
              <View
                accessibilityLabel={`${student.name}: contribuiu`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  backgroundColor: "#0CC50C",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="check-circle-outline" size={18} color={colors.paper} />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Nenhuma contribuição registrada neste mês.</Text>
        )}
      </View>

      <View style={{ marginTop: "auto", paddingTop: 12 }}>
        <Button title="REGISTRAR NOVA DOAÇÃO" onPress={() => openCostAidEntry()} />
      </View>
    </Page>
  );
}
