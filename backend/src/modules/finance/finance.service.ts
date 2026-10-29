import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Expense, Revenue } from '../../generated/prisma/client.js';
import { RevenueCategory } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.module.js';
import { displayDate } from '../access/access.validation.js';
import type { CostAidQueryDto, ExpenseDto, RevenueDto, UpdateExpenseDto, UpdateRevenueDto } from './dto/finance.dto.js';

const withStudent = { student: { select: { id: true, name: true } } };
const toCents = (value: unknown) => Math.round(Number(value) * 100);
const fromCents = (cents: number) => cents / 100;

// DD/MM/AAAA -> Date (UTC); recusa datas que não existem, como 31/02.
export function parseDate(value: string): Date {
  const [day, month, year] = value.split('/');
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(day)) throw new BadRequestException('Data inválida.');
  return date;
}

// Resposta no formato que o app usa: valor como number e data em DD/MM/AAAA.
function view<T extends Revenue | Expense>(entry: T) {
  return { ...entry, amount: Number(entry.amount), date: displayDate(entry.date) };
}

// PATCH: ignora o que não veio; null só vale em studentId/beneficiary (alternar destino).
function sent<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => value !== undefined && (value !== null || key === 'studentId' || key === 'beneficiary')),
  ) as Partial<T>;
}

// Regras comuns a receitas e despesas: título só (e obrigatório) em OUTROS.
function entryFields({ category, title, amount, date, description }: RevenueDto | ExpenseDto) {
  const name = title?.trim();
  if (category === 'OUTROS' && !name) throw new BadRequestException('Informe o título para a categoria Outros.');
  return { title: category === 'OUTROS' ? name : null, amount, date: parseDate(date), description: description?.trim() ?? '' };
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listRevenues() {
    const revenues = await this.prisma.revenue.findMany({
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: withStudent,
    });
    return revenues.map(view);
  }

  async createRevenue(dto: RevenueDto) {
    return view(await this.prisma.revenue.create({ data: await this.revenueFields(dto), include: withStudent }));
  }

  // HU019 / RF016: painel mensal com totais, histórico de 6 meses, despesas por categoria, pendentes e lançamentos do mês.
  async getMonthlySummary(query: CostAidQueryDto = {}) {
    const now = new Date();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();
    const historyStart = new Date(Date.UTC(year, month - 6, 1));
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const [revenues6m, expenses6m] = await Promise.all([
      this.prisma.revenue.findMany({
        where: { date: { gte: historyStart, lt: monthEnd } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: withStudent,
      }),
      this.prisma.expense.findMany({
        where: { date: { gte: historyStart, lt: monthEnd } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const buckets = new Map<string, { month: number; year: number; revCents: number; expCents: number }>();
    for (let offset = -5; offset <= 0; offset++) {
      const d = new Date(Date.UTC(year, month - 1 + offset, 1));
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      buckets.set(`${y}-${m}`, { month: m, year: y, revCents: 0, expCents: 0 });
    }
    for (const rev of revenues6m) {
      const key = `${rev.date.getUTCFullYear()}-${rev.date.getUTCMonth() + 1}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.revCents += toCents(rev.amount);
    }
    for (const exp of expenses6m) {
      const key = `${exp.date.getUTCFullYear()}-${exp.date.getUTCMonth() + 1}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.expCents += toCents(exp.amount);
    }
    const history = [...buckets.values()].map(({ month: m, year: y, revCents, expCents }) => ({
      month: m,
      year: y,
      revenues: fromCents(revCents),
      expenses: fromCents(expCents),
      balance: fromCents(revCents - expCents),
    }));

    const monthRevenues = revenues6m.filter((r) => r.date >= monthStart && r.date < monthEnd);
    const monthExpenses = expenses6m.filter((e) => e.date >= monthStart && e.date < monthEnd);

    const revCents = monthRevenues.reduce((sum, r) => sum + toCents(r.amount), 0);
    let paidExpCents = 0;
    let pendingExpCents = 0;
    let pendingCount = 0;
    const byCategory = new Map<string, { paidCents: number; pendingCents: number }>();

    for (const exp of monthExpenses) {
      const cents = toCents(exp.amount);
      const current = byCategory.get(exp.category) ?? { paidCents: 0, pendingCents: 0 };
      if (exp.status === 'PENDENTE') {
        pendingExpCents += cents;
        pendingCount++;
        current.pendingCents += cents;
      } else {
        paidExpCents += cents;
        current.paidCents += cents;
      }
      byCategory.set(exp.category, current);
    }

    const totalExpCents = paidExpCents + pendingExpCents;
    const expensesByCategory = [...byCategory.entries()]
      .map(([category, { paidCents, pendingCents }]) => ({
        category,
        total: fromCents(paidCents + pendingCents),
        paid: fromCents(paidCents),
        pending: fromCents(pendingCents),
      }))
      .sort((a, b) => b.total - a.total);

    const pendingExpenses = monthExpenses.filter((e) => e.status === 'PENDENTE').map(view);

    const entries = [
      ...monthRevenues.map((raw) => ({ raw, item: { kind: 'revenue' as const, ...view(raw) } })),
      ...monthExpenses.map((raw) => ({ raw, item: { kind: 'expense' as const, ...view(raw) } })),
    ]
      .sort((a, b) => b.raw.date.getTime() - a.raw.date.getTime() || b.raw.createdAt.getTime() - a.raw.createdAt.getTime())
      .map(({ item }) => item);

    return {
      month,
      year,
      totals: {
        revenues: fromCents(revCents),
        expenses: fromCents(totalExpCents),
        paidExpenses: fromCents(paidExpCents),
        pendingExpenses: fromCents(pendingExpCents),
        pendingCount,
        balance: fromCents(revCents - totalExpCents),
      },
      history,
      expensesByCategory,
      pendingExpenses,
      entries,
    };
  }

  // HU017 / RF014: relação mensal de atletas que contribuíram e pendentes na ajuda de custo.
  async listCostAid(query: CostAidQueryDto = {}) {
    const now = new Date();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [students, revenues] = await Promise.all([
      this.prisma.student.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.revenue.findMany({
        where: {
          category: RevenueCategory.AJUDA_DE_CUSTO,
          studentId: { not: null },
          date: { gte: start, lt: end },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const byStudent = new Map<string, Revenue>();
    for (const revenue of revenues) {
      if (revenue.studentId && !byStudent.has(revenue.studentId)) {
        byStudent.set(revenue.studentId, revenue);
      }
    }

    const contributed: Array<{ id: string; name: string; revenueId: string; amount: number; date: string; paymentMethod: string }> = [];
    const pending: Array<{ id: string; name: string }> = [];

    for (const student of students) {
      const entry = byStudent.get(student.id);
      if (entry) {
        contributed.push({
          id: student.id,
          name: student.name,
          revenueId: entry.id,
          amount: Number(entry.amount),
          date: displayDate(entry.date),
          paymentMethod: entry.paymentMethod,
        });
      } else {
        pending.push({ id: student.id, name: student.name });
      }
    }

    return { month, year, contributed, pending };
  }

  // Edição parcial: completa o que não veio com os dados atuais e valida tudo de novo.
  async updateRevenue(id: string, patch: UpdateRevenueDto) {
    const current = view(await this.findRevenue(id));
    const data = await this.revenueFields({
      ...current,
      title: current.title ?? undefined,
      donor: current.donor ?? undefined,
      beneficiary: current.beneficiary ?? undefined,
      ...sent(patch),
    });
    return view(await this.prisma.revenue.update({ where: { id }, data, include: withStudent }));
  }

  async removeRevenue(id: string): Promise<void> {
    await this.findRevenue(id);
    await this.prisma.revenue.delete({ where: { id } });
  }

  async listExpenses() {
    const expenses = await this.prisma.expense.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] });
    return expenses.map(view);
  }

  async createExpense(dto: ExpenseDto) {
    return view(await this.prisma.expense.create({ data: this.expenseFields(dto) }));
  }

  async updateExpense(id: string, patch: UpdateExpenseDto) {
    const current = view(await this.findExpense(id));
    const data = this.expenseFields({ ...current, title: current.title ?? undefined, ...sent(patch) });
    return view(await this.prisma.expense.update({ where: { id }, data }));
  }

  async removeExpense(id: string): Promise<void> {
    await this.findExpense(id);
    await this.prisma.expense.delete({ where: { id } });
  }

  // Atleta é obrigatório em Ajuda de Custo; em Doação/Patrocínio exige doador e destino (atleta ou beneficiado).
  private async revenueFields(dto: RevenueDto) {
    const isCostAid = dto.category === RevenueCategory.AJUDA_DE_CUSTO;
    const isDonation = dto.category === RevenueCategory.PATROCINIO_DOACAO;
    const donor = dto.donor?.trim();
    const beneficiary = dto.beneficiary?.trim();

    if (isCostAid && !dto.studentId) {
      throw new BadRequestException('Selecione o atleta para a categoria Ajuda de custo.');
    }
    if (isDonation && !donor) {
      throw new BadRequestException('Informe o doador ou patrocinador para a categoria Doação/Patrocínio.');
    }
    const studentId = isCostAid || isDonation ? (dto.studentId ?? null) : null;
    if (isDonation && !studentId && !beneficiary) {
      throw new BadRequestException('Informe o beneficiado para a categoria Doação/Patrocínio.');
    }
    if (studentId && !(await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }))) {
      throw new NotFoundException('Atleta não encontrado.');
    }
    return {
      ...entryFields(dto),
      category: dto.category,
      donor: isDonation ? donor! : null,
      beneficiary: isDonation && !studentId ? beneficiary! : null,
      paymentMethod: dto.paymentMethod,
      studentId,
    };
  }

  private expenseFields(dto: ExpenseDto) {
    return { ...entryFields(dto), category: dto.category, status: dto.status };
  }

  private async findRevenue(id: string): Promise<Revenue> {
    const revenue = await this.prisma.revenue.findUnique({ where: { id } });
    if (!revenue) throw new NotFoundException('Receita não encontrada.');
    return revenue;
  }

  private async findExpense(id: string): Promise<Expense> {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Despesa não encontrada.');
    return expense;
  }
}
