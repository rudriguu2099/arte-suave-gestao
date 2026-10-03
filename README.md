# Arte Suave Gestão - Projeto Integrado III

Repositório do sistema de gestão. Stack: NestJS (Backend) + React Native / Expo (Frontend).

## Rodando

```bash
./inicializar.sh   # ou: docker compose up -d --build
```

O banco usa **Prisma**. As migrations rodam sozinhas quando o backend sobe; não precisa fazer nada.

### Banco (Prisma)

Mudou o banco? Edite `backend/prisma/schema.prisma` e gere a migration:

```bash
docker compose exec backend npx prisma migrate dev --name o_que_mudou
```

Commite a pasta `backend/prisma/migrations` junto. Quem puxar só precisa subir o compose de novo.

Acessar o banco direto:

```bash
docker compose exec db psql -U postgres -d arte_suave_gestao
```

**Primeira vez depois da troca do TypeORM pelo Prisma:** rode `docker compose down -v` uma vez antes de subir. Isso recria o banco de dev e o volume de `node_modules`, que ainda tem as dependências antigas.
