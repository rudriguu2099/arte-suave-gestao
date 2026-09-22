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

  it('cria um usuário para os testes seguintes', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Usuario Teste E2E',
        email: `teste.e2e.${Date.now()}@artesuave.com`,
        birthDate: '2000-01-01',
        role: 'ADMINISTRADOR',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    createdUserId = res.body.id;
  });

  it('PATCH /admin/users/:id atualiza dados', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Usuario Editado' })
      .expect(200);

    expect(res.body.name).toBe('Usuario Editado');
  });

  it('PATCH /admin/users/:id retorna 400 para id inválido (não-UUID)', () => {
    return request(app.getHttpServer())
      .patch('/admin/users/nao-e-um-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
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

  it('GET /admin/users/:id retorna 404 após o soft delete', () => {
    return request(app.getHttpServer())
      .get(`/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /admin/users/:id em id inexistente retorna 404', () => {
    return request(app.getHttpServer())
      .delete('/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});