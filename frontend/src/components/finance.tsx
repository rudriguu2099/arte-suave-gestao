import { Pressable, Text, View } from "react-native";
import { Badge, colors, styles } from "./ui";
import {
  expenseCategoryLabel,
  paymentMethodLabel,
  revenueCategoryLabel,
  type FinanceEntryItem,
} from "../services/finance";
import { formatarReais } from "../utils/validators";

export const financePalette = {
  green: colors.success,
  chartGreen: "#059669",
  red: colors.error,
  amber: colors.warning,
  paidBg: colors.successBg,
  paidBorder: colors.successBorder,
  pendingBg: colors.warningBg,
  pendingBorder: colors.warningBorder,
  pendingText: colors.warning,
  pillTrack: colors.surface,
  chartRevenue: "#4C1D95",
  chartExpense: "#B9A8CE",
};

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

// Card de lançamento do painel mensal (HU019) e do histórico (HU022).
export function FinanceEntryCard({ entry, onEdit }: { entry: FinanceEntryItem; onEdit: () => void }) {
  const isRevenue = entry.kind === "revenue";
  const titleText = isRevenue
    ? revenueCategoryLabel(entry.category, entry.title)
    : expenseCategoryLabel(entry.category, entry.title);
  const signedValue = formatarReais(isRevenue ? entry.amount : -entry.amount, true);
  const isPaid = !isRevenue && entry.status === "PAGA";

  return (
    <View style={[styles.card, { padding: 16, gap: 8 }]}>
      <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
        <View style={[styles.wrap, { flex: 1, minWidth: 0, gap: 8 }]}>
          <Text
            numberOfLines={2}
            style={[styles.text, { fontWeight: "700", fontSize: 16, color: colors.ink, flexShrink: 1 }]}
          >
            {titleText}
          </Text>
          {!isRevenue && (
            <Badge label={isPaid ? "PAGO" : "PENDENTE"} tone={isPaid ? "green" : "amber"} />
          )}
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "900",
            color: isRevenue ? financePalette.green : financePalette.red,
          }}
        >
          {signedValue}
        </Text>
      </View>

      <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
        <Text numberOfLines={3} style={[styles.muted, { flex: 1, minWidth: 0, fontSize: 12 }]}>
          {entrySubtitle(entry)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${titleText}`}
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => ({
            paddingHorizontal: 8,
            paddingVertical: 4,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.8,
              color: colors.muted,
            }}
          >
            EDITAR
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
