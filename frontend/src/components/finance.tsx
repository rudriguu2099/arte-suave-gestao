import { Text, View } from "react-native";
import { Button, styles } from "./ui";
import {
  expenseCategoryLabel,
  paymentMethodLabel,
  revenueCategoryLabel,
  type FinanceEntryItem,
} from "../services/finance";
import { formatarReais } from "../utils/validators";

export const financePalette = {
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
    <View style={[styles.card, { padding: 14, gap: 6 }]}>
      <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
        <View style={[styles.row, { flex: 1, minWidth: 0, gap: 8 }]}>
          <Text numberOfLines={2} style={[styles.text, { fontWeight: "700", fontSize: 15, flexShrink: 1, minWidth: 0 }]}>
            {titleText}
          </Text>
          {!isRevenue && (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 3,
                borderWidth: 1,
                backgroundColor: isPaid ? financePalette.paidBg : financePalette.pendingBg,
                borderColor: isPaid ? financePalette.paidBorder : financePalette.pendingBorder,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  letterSpacing: 0.6,
                  color: isPaid ? financePalette.green : financePalette.pendingText,
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
            color: isRevenue ? financePalette.green : financePalette.red,
          }}
        >
          {signedValue}
        </Text>
      </View>

      <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
        <Text numberOfLines={3} style={[styles.muted, { flex: 1, minWidth: 0, fontSize: 11 }]}>
          {entrySubtitle(entry)}
        </Text>
        <Button title="EDITAR" compact secondary onPress={onEdit} />
      </View>
    </View>
  );
}