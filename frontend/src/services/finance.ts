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

// amount em reais; date em DD/MM/AAAA; title só em OUTROS; donor e beneficiary só em PATROCINIO_DOACAO.
type Entry = { category: string; title?: string; amount: number; date: string; description?: string };
export type RevenueInput = Entry & { paymentMethod: string; donor?: string; beneficiary?: string; studentId?: string };
export type ExpenseInput = Entry & { status: string };

export type CostAidResponse = {
  month: number;
  year: number;
  contributed: { id: string; name: string; revenueId: string; amount: number; date: string; paymentMethod: string }[];
  pending: { id: string; name: string }[];
};

export const financeApi = {
  createRevenue: (token: string, input: RevenueInput) => api.post("/finance/revenues", input, token),
  createExpense: (token: string, input: ExpenseInput) => api.post("/finance/expenses", input, token),
  listCostAid: (token: string, month: number, year: number) =>
    api.get<CostAidResponse>(`/finance/cost-aid?month=${month}&year=${year}`, token),
};
