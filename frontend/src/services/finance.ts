import { api } from "./api";

// Mesmos valores dos enums do backend (schema.prisma).
export const revenueCategories = [
  { value: "AJUDA_DE_CUSTO", label: "Ajuda de custo" },
  { value: "PATROCINIO_DOACAO", label: "Doação/Patrocínio" },
  { value: "TAXA_INSCRICAO_CAMPEONATO", label: "Taxa de inscrição de campeonato" },
  { value: "OUTROS", label: "Outros" },
];
export const expenseCategories = [
  { value: "ALUGUEL", label: "Aluguel" },
  { value: "INSCRICAO_CAMPEONATO", label: "Inscrição de campeonato" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "MATERIAIS", label: "Materiais" },
  { value: "OUTROS", label: "Outros" },
];
export const paymentMethods = [
  { value: "PIX", label: "Pix" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CARTAO", label: "Cartão" },
  { value: "OUTRO", label: "Outro" },
];
export const expenseStatuses = [
  { value: "PAGA", label: "Paga" },
  { value: "PENDENTE", label: "Pendente" },
];

export function revenueCategoryLabel(category: string, title?: string | null): string {
  if (category === "OUTROS" && title?.trim()) return title.trim();
  return revenueCategories.find((item) => item.value === category)?.label ?? category;
}

export function expenseCategoryLabel(category: string, title?: string | null): string {
  if (category === "OUTROS" && title?.trim()) return title.trim();
  return expenseCategories.find((item) => item.value === category)?.label ?? category;
}

export function paymentMethodLabel(method: string): string {
  return paymentMethods.find((item) => item.value === method)?.label ?? method;
}

// amount em reais; date em DD/MM/AAAA; title só em OUTROS; donor e beneficiary só em PATROCINIO_DOACAO.
type Entry = { category: string; title?: string; amount: number; date: string; description?: string };
export type RevenueInput = Entry & { paymentMethod: string; donor?: string; beneficiary?: string; studentId?: string };
export type RevenueUpdateInput = Omit<RevenueInput, "studentId"> & { studentId?: string | null };
export type ExpenseInput = Entry & { status: string };

export type FinanceRevenueEntry = {
  kind: "revenue";
  id: string;
  category: string;
  title: string | null;
  donor: string | null;
  beneficiary: string | null;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  studentId: string | null;
  student?: { id: string; name: string } | null;
};

export type FinanceExpenseEntry = {
  kind: "expense";
  id: string;
  category: string;
  title: string | null;
  amount: number;
  date: string;
  status: "PAGA" | "PENDENTE";
  description: string;
};

export type FinanceEntryItem = FinanceRevenueEntry | FinanceExpenseEntry;

export type FinanceHistoryPoint = {
  month: number;
  year: number;
  revenues: number;
  expenses: number;
  balance: number;
};

export type FinanceExpenseByCategory = {
  category: string;
  total: number;
  paid: number;
  pending: number;
};

export type FinanceSummaryResponse = {
  month: number;
  year: number;
  totals: {
    revenues: number;
    expenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    pendingCount: number;
    balance: number;
  };
  history: FinanceHistoryPoint[];
  expensesByCategory: FinanceExpenseByCategory[];
  pendingExpenses: Omit<FinanceExpenseEntry, "kind">[];
  entries: FinanceEntryItem[];
};

export type CostAidResponse = {
  month: number;
  year: number;
  contributed: { id: string; name: string; revenueId: string; amount: number; date: string; paymentMethod: string }[];
  pending: { id: string; name: string }[];
};

export const financeApi = {
  getSummary: (token: string, month: number, year: number) =>
    api.get<FinanceSummaryResponse>(`/finance/summary?month=${month}&year=${year}`, token),
  createRevenue: (token: string, input: RevenueInput) => api.post("/finance/revenues", input, token),
  updateRevenue: (token: string, id: string, input: RevenueUpdateInput) =>
    api.patch(`/finance/revenues/${encodeURIComponent(id)}`, input, token),
  createExpense: (token: string, input: ExpenseInput) => api.post("/finance/expenses", input, token),
  updateExpense: (token: string, id: string, input: ExpenseInput) =>
    api.patch(`/finance/expenses/${encodeURIComponent(id)}`, input, token),
  listCostAid: (token: string, month: number, year: number) =>
    api.get<CostAidResponse>(`/finance/cost-aid?month=${month}&year=${year}`, token),
};
