import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Expense, Revenue } from '../../generated/prisma/client.js';
import { RevenueCategory } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.module.js';
import { displayDate } from '../access/access.validation.js';
import type { CostAidQueryDto, ExpenseDto, RevenueDto, UpdateExpenseDto, UpdateRevenueDto } from './dto/finance.dto.js';

const withStudent = { student: { select: { id: true, name: true } } };

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
