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
  jwt: {
    secret: process.env.JWT_SECRET ?? 'changeme',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
});
