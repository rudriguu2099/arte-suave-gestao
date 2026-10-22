import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { FinanceService, parseDate } from './finance.service.js';
import { PrismaService } from '../../prisma/prisma.module.js';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: {
    revenue: Record<'create' | 'update' | 'findUnique' | 'findMany', ReturnType<typeof vi.fn>>;
    expense: Record<'create' | 'update' | 'findUnique', ReturnType<typeof vi.fn>>;
    student: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  };

  const studentId = '6f1c2a3e-1111-4222-8333-944455556666';
  const revenue = {
    category: 'AJUDA_DE_CUSTO' as const,
    amount: 100,
    date: '05/10/2026',
    paymentMethod: 'PIX' as const,
    studentId,
  };
  // O create/update devolvem o que receberam, como o banco faria.
  const echo = ({ data }: { data: object }) => Promise.resolve({ id: 'r1', createdAt: new Date(), ...data });

  beforeEach(async () => {
    const model = () => ({ create: vi.fn(echo), update: vi.fn(echo), findUnique: vi.fn(), findMany: vi.fn() });
    prisma = {
      revenue: model(),
      expense: model(),
      student: { findUnique: vi.fn().mockResolvedValue({ id: studentId }), findMany: vi.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(FinanceService);
  });

  describe('parseDate', () => {
    it('converte DD/MM/AAAA e recusa datas inexistentes', () => {
      expect(parseDate('05/10/2026').toISOString()).toBe('2026-10-05T00:00:00.000Z');
      expect(() => parseDate('31/02/2026')).toThrow(BadRequestException);
      expect(() => parseDate('01/13/2026')).toThrow(BadRequestException);
    });
  });

  describe('createRevenue', () => {
    it('vincula o atleta em Ajuda de Custo e devolve valor como number e data em DD/MM/AAAA', async () => {
      const result = await service.createRevenue(revenue);

      expect(prisma.revenue.create.mock.calls[0][0].data).toMatchObject({
        studentId,
        title: null,
        donor: null,
        beneficiary: null,
        description: '',
      });
      expect(result).toMatchObject({ amount: 100, date: '05/10/2026', studentId });
    });

    it('exige atleta vinculado em Ajuda de Custo', async () => {
      await expect(service.createRevenue({ ...revenue, studentId: undefined })).rejects.toThrow(BadRequestException);
    });

    it('grava doador e atleta beneficiado em Doação/Patrocínio (HU018)', async () => {
      const result = await service.createRevenue({
        ...revenue,
        category: 'PATROCINIO_DOACAO',
        donor: '  Empresa Local  ',
        beneficiary: 'Ignorado pois tem atleta',
      });

      expect(prisma.revenue.create.mock.calls[0][0].data).toMatchObject({
        category: 'PATROCINIO_DOACAO',
        donor: 'Empresa Local',
        beneficiary: null,
        studentId,
        title: null,
      });
      expect(result).toMatchObject({ donor: 'Empresa Local', beneficiary: null, studentId });
    });

    it('grava beneficiado livre quando o destino em Doação/Patrocínio é Outros (HU018)', async () => {
      const result = await service.createRevenue({
        ...revenue,
        category: 'PATROCINIO_DOACAO',
        donor: 'Empresa Local',
        studentId: undefined,
        beneficiary: '  Compra de tatames  ',
      });

      expect(prisma.revenue.create.mock.calls[0][0].data).toMatchObject({
        category: 'PATROCINIO_DOACAO',
        donor: 'Empresa Local',
        beneficiary: 'Compra de tatames',
        studentId: null,
      });
      expect(result).toMatchObject({ donor: 'Empresa Local', beneficiary: 'Compra de tatames', studentId: null });
    });

    it('exige doador e destino (atleta ou beneficiado) em Doação/Patrocínio (HU018 / RN011)', async () => {
      await expect(service.createRevenue({ ...revenue, category: 'PATROCINIO_DOACAO', donor: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.createRevenue({
          ...revenue,
          category: 'PATROCINIO_DOACAO',
          donor: 'Empresa Local',
          studentId: undefined,
          beneficiary: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('descarta o atleta, doador e beneficiado nas outras categorias', async () => {
      await service.createRevenue({
        ...revenue,
        category: 'TAXA_INSCRICAO_CAMPEONATO',
        donor: 'Ignorado',
        beneficiary: 'Ignorado',
      });

      expect(prisma.revenue.create.mock.calls[0][0].data.studentId).toBeNull();
      expect(prisma.revenue.create.mock.calls[0][0].data.donor).toBeNull();
      expect(prisma.revenue.create.mock.calls[0][0].data.beneficiary).toBeNull();
      expect(prisma.student.findUnique).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando o atleta não existe', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.createRevenue(revenue)).rejects.toThrow(NotFoundException);
      expect(prisma.revenue.create).not.toHaveBeenCalled();
    });

    it('exige título em OUTROS', async () => {
      await expect(service.createRevenue({ ...revenue, category: 'OUTROS', title: '  ' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateRevenue', () => {
    const stored = { id: 'r1', category: 'AJUDA_DE_CUSTO', title: null, amount: '100.00', date: new Date('2026-10-05T00:00:00Z'), paymentMethod: 'PIX', description: '', studentId, createdAt: new Date() };

    it('mantém o que não veio e desvincula o atleta ao trocar a categoria', async () => {
      prisma.revenue.findUnique.mockResolvedValue(stored);

      await service.updateRevenue('r1', { category: 'OUTROS', title: 'Rifa' });

      expect(prisma.revenue.update.mock.calls[0][0].data).toMatchObject({
        category: 'OUTROS',
        title: 'Rifa',
        amount: 100,
        date: new Date('2026-10-05T00:00:00Z'),
        paymentMethod: 'PIX',
        studentId: null,
      });
    });

    it('studentId: null em Doação/Patrocínio desvincula o atleta e usa beneficiary', async () => {
      prisma.revenue.findUnique.mockResolvedValue({
        ...stored,
        category: 'PATROCINIO_DOACAO',
        donor: 'Empresa Local',
      });

      await service.updateRevenue('r1', { studentId: null, beneficiary: 'Compra de tatames' });

      expect(prisma.revenue.update.mock.calls[0][0].data).toMatchObject({
        studentId: null,
        beneficiary: 'Compra de tatames',
      });
    });

    it('lança NotFoundException quando a receita não existe', async () => {
      prisma.revenue.findUnique.mockResolvedValue(null);

      await expect(service.updateRevenue('x', { amount: 1 })).rejects.toThrow('Receita não encontrada');
    });
  });

  describe('createExpense', () => {
    it('grava situação e título só em OUTROS', async () => {
      await service.createExpense({ category: 'ALUGUEL', title: 'ignorado', amount: 800, date: '01/10/2026', status: 'PENDENTE' });

      expect(prisma.expense.create.mock.calls[0][0].data).toMatchObject({ category: 'ALUGUEL', title: null, status: 'PENDENTE' });
    });
  });

  describe('listCostAid (HU017)', () => {
    it('separa atletas ativos entre contributed e pending no mês de referência', async () => {
      prisma.student.findMany.mockResolvedValue([
        { id: 's1', name: 'Anna Beatryz' },
        { id: 's2', name: 'João Filho' },
        { id: 's3', name: 'Lucas Alves' },
      ]);
      prisma.revenue.findMany.mockResolvedValue([
        {
          id: 'rev-1',
          category: 'AJUDA_DE_CUSTO',
          amount: '30.00',
          date: new Date('2026-09-07T00:00:00Z'),
          paymentMethod: 'DINHEIRO',
          studentId: 's2',
          createdAt: new Date(),
        },
      ]);

      const result = await service.listCostAid({ month: 9, year: 2026 });

      expect(result).toEqual({
        month: 9,
        year: 2026,
        contributed: [
          {
            id: 's2',
            name: 'João Filho',
            revenueId: 'rev-1',
            amount: 30,
            date: '07/09/2026',
            paymentMethod: 'DINHEIRO',
          },
        ],
        pending: [
          { id: 's1', name: 'Anna Beatryz' },
          { id: 's3', name: 'Lucas Alves' },
        ],
      });
    });
  });
});
