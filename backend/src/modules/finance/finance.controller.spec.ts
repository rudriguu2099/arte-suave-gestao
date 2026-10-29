import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard.js';
import { FinanceController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';

describe('FinanceController (HTTP)', () => {
  let app: INestApplication;
  const service = {
    getMonthlySummary: vi.fn().mockResolvedValue({
      month: 9,
      year: 2026,
      totals: { revenues: 260, expenses: 1850, paidExpenses: 1500, pendingExpenses: 350, pendingCount: 1, balance: -1590 },
      history: [],
      expensesByCategory: [],
      pendingExpenses: [],
      entries: [],
    }),
  };

  beforeEach(async () => {
    service.getMonthlySummary.mockClear();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: service }, SuperAdminGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const auth = req.headers['authorization'];
          if (!auth) throw new UnauthorizedException();
          req.user = {
            id: 'u1',
            email: 'admin@artesuave.com',
            role: 'ADMINISTRADOR',
            isSuperAdmin: auth === 'Bearer superadmin',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /finance/summary converte month/year numéricos e retorna o resumo para superadmin', async () => {
    const res = await request(app.getHttpServer())
      .get('/finance/summary?month=9&year=2026')
      .set('Authorization', 'Bearer superadmin')
      .expect(200);

    expect(service.getMonthlySummary).toHaveBeenCalledWith({ month: 9, year: 2026 });
    expect(res.body.totals.balance).toBe(-1590);
  });

  it('GET /finance/summary recusa mês fora de 1..12 com 400', async () => {
    await request(app.getHttpServer())
      .get('/finance/summary?month=13&year=2026')
      .set('Authorization', 'Bearer superadmin')
      .expect(400);

    expect(service.getMonthlySummary).not.toHaveBeenCalled();
  });

  it('GET /finance/summary bloqueia administrador comum (403) e requisição sem token (401)', async () => {
    await request(app.getHttpServer()).get('/finance/summary').expect(401);
    await request(app.getHttpServer())
      .get('/finance/summary')
      .set('Authorization', 'Bearer common-admin')
      .expect(403);
  });
});
