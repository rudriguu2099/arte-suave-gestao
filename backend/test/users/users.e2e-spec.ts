import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdUserId: string;

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

  it('cria um responsável para os testes seguintes', async () => {
    const email = `teste.e2e.${Date.now()}@artesuave.com`;
    await request(app.getHttpServer())
      .post('/access/profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Usuario Teste E2E', birthDate: '01/01/2000', role: 'responsible', emails: [email], phones: [] })
      .expect(201);

    const state = await request(app.getHttpServer())
      .get('/access/state')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    createdUserId = state.body.accounts.find((a: { emails: string[] }) => a.emails[0] === email).id;
    expect(createdUserId).toBeDefined();
  });

  it('PATCH /admin/users/:id/reset-password redefine a senha', () => {
    return request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'NovaSenha123' })
      .expect(200);
  });

  it('PATCH /admin/users/:id/reset-password retorna 400 quando a senha é a mesma', () => {
    return request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'NovaSenha123' })
      .expect(400);
  });

  it('PATCH /admin/users/:id/reset-password retorna 400 para id inválido (não-UUID)', () => {
    return request(app.getHttpServer())
      .patch('/admin/users/nao-e-um-uuid/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'NovaSenha123' })
      .expect(400);
  });

  it('DELETE /admin/users/:id sem token retorna 401', () => {
    return request(app.getHttpServer())
      .delete(`/admin/users/${createdUserId}`)
      .expect(401);
  });

  it('DELETE /admin/users/:id remove (soft delete)', () => {
    return request(app.getHttpServer())
      .delete(`/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('DELETE /admin/users/:id retorna 404 após o soft delete', () => {
    return request(app.getHttpServer())
      .delete(`/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
