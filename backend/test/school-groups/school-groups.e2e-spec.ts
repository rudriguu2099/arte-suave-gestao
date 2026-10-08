import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('SchoolGroups (e2e) - HU012 + HU014', () => {
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

  it('cria atleta na turma "child" para os testes seguintes', async () => {
    const email = `atleta.sg.e2e.${Date.now()}@artesuave.com`;

    await request(app.getHttpServer())
      .post('/access/profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Atleta SG E2E',
        birthDate: '01/01/2000',
        role: 'athlete',
        emails: [email],
        phones: [],
        groupId: 'child',
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

  describe('GET /school-groups/:id/students', () => {
    it('lista atletas da turma', async () => {
      const res = await request(app.getHttpServer())
        .get('/school-groups/child/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((s: { id: string }) => s.id === studentId);
      expect(found).toBeDefined();
    });

    it('após mover o atleta, ele sai da turma antiga', async () => {
      await request(app.getHttpServer())
        .patch(`/students/${studentId}/group`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ groupId: 'juvenile' })
        .expect(200);

      const oldGroup = await request(app.getHttpServer())
        .get('/school-groups/child/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = oldGroup.body.find((s: { id: string }) => s.id === studentId);
      expect(found).toBeUndefined();
    });

    it('retorna 404 para turma inexistente', () => {
      return request(app.getHttpServer())
        .get('/school-groups/turma-que-nao-existe/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sem token', () => {
      return request(app.getHttpServer())
        .get('/school-groups/child/students')
        .expect(401);
    });
  });
});