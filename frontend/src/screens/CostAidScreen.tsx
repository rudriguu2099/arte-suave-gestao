import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AdminFooter } from "../components/access";
import {
  Back,
  Button,
  colors,
  Dialog,
  ErrorMessage,
  HeaderBand,
  Heading,
  Page,
  SectionLabel,
  styles,
} from "../components/ui";
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
  const [undoTarget, setUndoTarget] = useState<CostAidResponse["contributed"][number] | null>(null);
  const [undoing, setUndoing] = useState(false);

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

  async function confirmUndo() {
    if (!undoTarget || undoing) return;
    setUndoing(true);
    setError("");
    try {
      await financeApi.removeRevenue(getToken(), undoTarget.revenueId);
      setUndoTarget(null);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut();
      setUndoTarget(null);
      setError((e as Error).message);
    } finally {
      setUndoing(false);
    }
  }

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Finance" />}>
      <Dialog
        visible={!!undoTarget}
        title="Desfazer contribuição?"
        message={
          undoTarget
            ? `Deseja remover a ajuda de custo registrada de ${undoTarget.name} em ${monthNames[month - 1]} ${year}?`
            : ""
        }
        confirmLabel="DESFAZER"
        danger
        busy={undoing}
        onConfirm={confirmUndo}
        onClose={() => setUndoTarget(null)}
      />

      <HeaderBand>
        <Back onPress={navigation.goBack} />
        <Heading title="AJUDA DE CUSTO" />

        <View style={[styles.row, { justifyContent: "space-between", paddingHorizontal: 4 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            hitSlop={10}
            onPress={() => changeMonth(-1)}
            style={{ padding: 4 }}
          >
            <MaterialIcons name="chevron-left" size={22} color={colors.muted} />
          </Pressable>
          <Text style={[styles.text, { fontWeight: "700", fontSize: 16, color: colors.ink }]}>
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

        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, paddingVertical: 16, gap: 4 }]}>
            <Text style={{ fontSize: 28, fontWeight: "900", color: colors.success }}>
              {data.contributed.length}
            </Text>
            <Text style={styles.label}>CONTRIBUÍRAM</Text>
          </View>

          <View style={[styles.card, { flex: 1, paddingVertical: 16, gap: 4 }]}>
            <Text style={{ fontSize: 28, fontWeight: "900", color: colors.warning }}>
              {data.pending.length}
            </Text>
            <Text style={styles.label}>PENDENTES</Text>
          </View>
        </View>
      </HeaderBand>

      <ErrorMessage message={error} />

      <View style={{ gap: 10 }}>
        <SectionLabel title="PENDENTES" />
        {loading ? (
          <Text style={styles.muted}>Carregando...</Text>
        ) : data.pending.length ? (
          data.pending.map((student) => (
            <View
              key={student.id}
              style={[
                styles.card,
                styles.row,
                {
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderColor: colors.warningBorder,
                },
              ]}
            >
              <Text style={[styles.text, { fontWeight: "700", fontSize: 15, color: colors.ink, flex: 1 }]}>
                {student.name}
              </Text>
              <Button
                title="REGISTRAR"
                compact
                onPress={() => openCostAidEntry(student.id)}
              />
            </View>
          ))
        ) : (
          <View style={[styles.card, { alignItems: "center", paddingVertical: 18 }]}>
            <Text style={styles.muted}>Nenhum atleta pendente neste mês.</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <SectionLabel title="CONTRIBUÍRAM" />
        {loading ? (
          <Text style={styles.muted}>Carregando...</Text>
        ) : data.contributed.length ? (
          data.contributed.map((student) => (
            <View
              key={student.id}
              style={[
                styles.card,
                styles.row,
                {
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderColor: colors.successBorder,
                },
              ]}
            >
              <View style={[styles.row, { flex: 1, gap: 10 }]}>
                <MaterialIcons name="check" size={18} color={colors.success} />
                <Text
                  accessibilityLabel={`${student.name}: contribuiu`}
                  style={[styles.text, { fontWeight: "700", fontSize: 15, color: colors.ink, flex: 1 }]}
                >
                  {student.name}
                </Text>
              </View>
              <Button
                title="DESFAZER"
                compact
                danger
                onPress={() => setUndoTarget(student)}
              />
            </View>
          ))
        ) : (
          <View style={[styles.card, { alignItems: "center", paddingVertical: 18 }]}>
            <Text style={styles.muted}>Nenhuma contribuição registrada neste mês.</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: "auto", paddingTop: 8 }}>
        <Button title="REGISTRAR NOVA AJUDA" onPress={() => openCostAidEntry()} />
      </View>
    </Page>
  );
}
