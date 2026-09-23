import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env');
const base = process.env.INTEGRATION_API_URL || 'http://localhost:3001';
assert(
  process.env.INTEGRATION_ADMIN_EMAIL && process.env.INTEGRATION_ADMIN_PASSWORD,
  'Configure INTEGRATION_ADMIN_EMAIL e INTEGRATION_ADMIN_PASSWORD.',
);
assert(process.env.NODE_ENV !== 'production', 'Use apenas em desenvolvimento.');
const db = new Client({
  host:
    process.env.DATABASE_HOST === 'db'
      ? '127.0.0.1'
      : process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});
await db.connect();
const marker = 'integration-' + randomUUID();
const ids = [];
let checks = 0;
async function call(path, method = 'GET', body, token, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  assert.equal(response.status, expected, method + ' ' + path + ': ' + text);
  checks++;
  return text ? JSON.parse(text) : undefined;
}
async function login(email, password) {
  return (
    await call('/auth/login', 'POST', { email, password }, undefined, 201)
  ).accessToken;
}
const state = (token) => call('/access/state', 'GET', undefined, token);
let root;
async function create(role, name, birthDate, extra = {}) {
  const profile = {
    role,
    name,
    birthDate,
    emails: [marker + '-' + ids.length + '@example.com'],
    phones: [],
    ...extra,
  };
  const result = await call('/access/profiles', 'POST', profile, root, 201);
  const row = (await state(root)).accounts.find(
    (a) => a.emails[0] === profile.emails[0],
  );
  if (row) ids.push(row.id);
  return { profile, result, row };
}
try {
  root = await login(
    process.env.INTEGRATION_ADMIN_EMAIL,
    process.env.INTEGRATION_ADMIN_PASSWORD,
  );
  const initial = await state(root);
  assert.equal(initial.current.isSuperAdmin, true);
  await call('/access/state', 'GET', undefined, undefined, 401);
  const guardian = await create('responsible', 'Álvaro Teste', '05/09/1980');
  assert.equal(guardian.result.password, 'álv05091980');
  const guardianToken = await login(
    guardian.profile.emails[0],
    guardian.result.password,
  );
  const admin = await create('admin', 'Instrutor Teste', '01/01/1990', {
    isSuperAdmin: true,
  });
  assert.equal(admin.row.isSuperAdmin, false);
  const adminToken = await login(
    admin.profile.emails[0],
    admin.result.password,
  );
  await call('/access/profiles', 'POST', guardian.profile, adminToken, 403);
  await call('/admin/users', 'GET', undefined, adminToken, 403);
  const day = new Date();
  const birth18 =
    String(day.getUTCDate()).padStart(2, '0') +
    '/' +
    String(day.getUTCMonth() + 1).padStart(2, '0') +
    '/' +
    (day.getUTCFullYear() - 18);
  const groupId = initial.groups[0].id;
  const adult = await create('athlete', 'Érica Teste', birth18, { groupId });
  const adultToken = await login(
    adult.profile.emails[0],
    adult.result.password,
  );
  assert.equal((await state(adultToken)).athletes.length, 1);
  assert.equal((await state(adultToken)).accounts.length, 1);
  const minorName = marker + '-minor';
  const minor = {
    role: 'athlete',
    name: minorName,
    birthDate: '10/01/2015',
    emails: [],
    phones: [],
    groupId,
    guardianId: guardian.row.id,
  };
  const minorResult = await call('/access/profiles', 'POST', minor, root, 201);
  assert.equal(minorResult.hasAccess, false);
  assert(!('password' in minorResult));
  const guardianState = await state(guardianToken);
  assert.equal(guardianState.athletes.length, 1);
  assert.equal(guardianState.athletes[0].name, minorName);
  assert.equal(guardianState.athletes[0].accountId, undefined);
  const minorId = guardianState.athletes[0].id;
  await call(
    '/access/profiles/athlete/' + minorId + '/toggle-active',
    'POST',
    {},
    root,
    201,
  );
  assert.equal((await state(guardianToken)).current.active, true);
  assert.equal((await state(guardianToken)).athletes[0].active, false);
  const count = (await state(root)).athletes.length;
  await call(
    '/access/profiles',
    'POST',
    { ...minor, guardianId: admin.row.id },
    root,
    400,
  );
  assert.equal((await state(root)).athletes.length, count);
  await call('/access/profiles', 'POST', adult.profile, root, 409);
  await call(
    '/access/profiles/account/' + adult.row.id,
    'PATCH',
    { ...adult.profile, name: 'Érica Atualizada' },
    root,
  );
  assert.equal((await state(adultToken)).athletes[0].name, 'Érica Atualizada');
  await call(
    '/access/profiles/account/' + adult.row.id + '/toggle-active',
    'POST',
    {},
    root,
    201,
  );
  await call('/access/state', 'GET', undefined, adultToken, 401);
  await call(
    '/auth/login',
    'POST',
    { email: adult.profile.emails[0], password: adult.result.password },
    undefined,
    401,
  );
  await call(
    '/access/profiles/account/' + adult.row.id + '/toggle-active',
    'POST',
    {},
    root,
    201,
  );
  await call('/access/state', 'GET', undefined, adultToken, 401);
  let renewed = await login(adult.profile.emails[0], adult.result.password);
  await call(
    '/admin/users/' + adult.row.id + '/reset-password',
    'PATCH',
    { newPassword: 'NovaSenha123' },
    root,
  );
  await call('/access/state', 'GET', undefined, renewed, 401);
  renewed = await login(adult.profile.emails[0], 'NovaSenha123');
  await call(
    '/auth/change-password',
    'POST',
    { currentPassword: 'NovaSenha123', newPassword: 'MinhaSenha456' },
    renewed,
    201,
  );
  await call('/access/state', 'GET', undefined, renewed, 401);
  renewed = await login(adult.profile.emails[0], 'MinhaSenha456');
  assert.equal((await state(renewed)).current.name, 'Érica Atualizada');
  const persisted = await db.query(
    'SELECT password, "isSuperAdmin" FROM users WHERE id=$1',
    [adult.row.id],
  );
  assert.equal(persisted.rows[0].isSuperAdmin, false);
  assert(await bcrypt.compare('MinhaSenha456', persisted.rows[0].password));
  const enrollment = await db.query(
    'SELECT id FROM students WHERE "accountId"=$1',
    [adult.row.id],
  );
  assert.equal(enrollment.rowCount, 1);
  await call(
    '/access/profiles/account/' + initial.current.id + '/toggle-active',
    'POST',
    {},
    root,
    400,
  );
  console.log(
    'PASS: ' +
      checks +
      ' requisições HTTP; persistência e hash conferidos no PostgreSQL.',
  );
} finally {
  await db.query(
    'DELETE FROM students WHERE "accountId" = ANY($1::uuid[]) OR "guardianId" = ANY($1::uuid[])',
    [ids],
  );
  await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
  await db.end();
}
