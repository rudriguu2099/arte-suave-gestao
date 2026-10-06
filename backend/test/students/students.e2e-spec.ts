import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('Students (e2e) - HU012 + HU014', () => {
  let app: INestApplication;
  let adminToken: string;
  let studentId: string;

  const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@artesuave.com';
  const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(201);

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria atleta na turma "adult" para os testes seguintes', async () => {
    const email = `atleta.e2e.${Date.now()}@artesuave.com`;

    await request(app.getHttpServer())
      .post('/access/profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Atleta Teste E2E',
        birthDate: '01/01/2000',
        role: 'athlete',
        emails: [email],
        phones: [],
        groupId: 'adult',
      })
      .expect(201);

    const state = await request(app.getHttpServer())
      .get('/access/state')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const created = state.body.athletes.find(
      (a: { emails: string[] }) => a.emails[0] === email,
    );
    studentId = created.id;
    expect(studentId).toBeDefined();
  });

  // ----------------------------------------------------------
  // HU012 — Vincular atleta a uma única turma (RF009)
  // ----------------------------------------------------------
  describe('HU012 — PATCH /students/:id/group', () => {
    it('vincula atleta a uma turma válida', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${studentId}/group`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groupId: 'juvenile' })
        .expect(200);

      expect(res.body.groupId).toBe('juvenile');
      expect(res.body.group).toBeDefined();
      expect(res.body.group.id).toBe('juvenile');
    });

    it('move o atleta para outra turma (única turma)', async () => {
      await request(app.getHttpServer())
        .patch(`/students/${studentId}/group`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groupId: 'adult' })
        .expect(200);

      // confirma que ele saiu de juvenile
      const juvenile = await request(app.getHttpServer())
        .get('/school-groups/juvenile/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = juvenile.body.find((s: { id: string }) => s.id === studentId);
      expect(found).toBeUndefined();
    });

    it('retorna 404 para turma inexistente', () => {
      return request(app.getHttpServer())
        .patch(`/students/${studentId}/group`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groupId: 'turma-que-nao-existe' })
        .expect(404);
    });

    it('retorna 404 para atleta inexistente', () => {
      return request(app.getHttpServer())
        .patch('/students/00000000-0000-0000-0000-000000000000/group')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groupId: 'adult' })
        .expect(404);
    });

    it('retorna 400 para id que não é UUID', () => {
      return request(app.getHttpServer())
        .patch('/students/nao-e-uuid/group')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groupId: 'adult' })
        .expect(400);
    });

    it('retorna 400 quando groupId está ausente', () => {
      return request(app.getHttpServer())
        .patch(`/students/${studentId}/group`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 401 sem token', () => {
      return request(app.getHttpServer())
        .patch(`/students/${studentId}/group`)
        .send({ groupId: 'adult' })
        .expect(401);
    });
  });

  // ----------------------------------------------------------
  // HU014 — Listar atletas com filtros
  // ----------------------------------------------------------
  describe('HU014 — GET /students', () => {
    it('lista todos os atletas sem filtro', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((s: { id: string }) => s.id === studentId);
      expect(found).toBeDefined();
    });

    it('filtra por turma (groupId)', async () => {
      const res = await request(app.getHttpServer())
        .get('/students?groupId=adult')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.every((s: { groupId: string }) => s.groupId === 'adult')).toBe(true);
    });

    it('busca por nome (case-insensitive)', async () => {
      const res = await request(app.getHttpServer())
        .get('/students?search=ATLETA')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.every((s: { name: string }) =>
          s.name.toLowerCase().includes('atleta'),
        ),
      ).toBe(true);
    });

    it('filtra por situação ativa', async () => {
      const res = await request(app.getHttpServer())
        .get('/students?active=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.every((s: { active: boolean }) => s.active === true)).toBe(true);
    });

    it('retorna absenceCount numérico em cada atleta', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.forEach((s: { absenceCount: unknown }) => {
        expect(typeof s.absenceCount).toBe('number');
      });
    });

    it('combina múltiplos filtros', async () => {
      const res = await request(app.getHttpServer())
        .get('/students?groupId=adult&active=true&search=atleta')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((s: { groupId: string; active: boolean; name: string }) => {
        expect(s.groupId).toBe('adult');
        expect(s.active).toBe(true);
        expect(s.name.toLowerCase()).toContain('atleta');
      });
    });

    it('retorna 401 sem token', () => {
      return request(app.getHttpServer())
        .get('/students')
        .expect(401);
    });
  });
});