import { defineConfig } from 'prisma/config';

// O CLI não lê o .env sozinho; variáveis já definidas (ex.: docker compose) têm prioridade.
try {
  process.loadEnvFile();
} catch {}

const env = process.env;
const url = `postgresql://${encodeURIComponent(env.DATABASE_USER ?? 'postgres')}:${encodeURIComponent(env.DATABASE_PASSWORD ?? '')}@${env.DATABASE_HOST ?? 'localhost'}:${env.DATABASE_PORT ?? '5432'}/${env.DATABASE_NAME ?? 'arte_suave_gestao'}`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
});
