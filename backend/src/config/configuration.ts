export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? '',
    name: process.env.DATABASE_NAME ?? 'arte_suave_gestao',
  },
  // Em desenvolvimento há um superadmin padrão; em produção ele precisa vir do ambiente.
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL || (process.env.NODE_ENV === 'production' ? undefined : 'admin@artesuave.com'),
    password: process.env.SUPERADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'admin123'),
    name: process.env.SUPERADMIN_NAME || 'Gestor do Projeto',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'changeme',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
});
