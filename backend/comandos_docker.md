# Ambiente de desenvolvimento com Docker

O backend (NestJS) e o banco de dados (PostgreSQL) são orquestrados via Docker Compose, com hot-reload habilitado.

## Pré-requisitos

- Docker e Docker Compose
- Copiar o arquivo de variáveis de ambiente do backend:

```bash
cp backend/.env.example backend/.env
```

> O `docker-compose.yml` já sobrescreve `DATABASE_HOST`/`DATABASE_PORT` para apontar para o serviço `db` da rede interna do Compose — não é necessário editar essas duas variáveis em `backend/.env` para rodar via Docker.

## Subindo o ambiente

```bash
# build das imagens e subida dos serviços em background
docker compose up -d --build

# subidas seguintes (sem rebuild)
docker compose up -d
```

O backend ficará disponível em `http://localhost:3000` (porta configurável via `PORT` em `backend/.env`) e o PostgreSQL em `localhost:5432`.

Alterações em `backend/src` são refletidas automaticamente no container (bind mount + `nest start --watch`), sem necessidade de rebuild da imagem.

## Logs

```bash
# logs de todos os serviços, seguindo em tempo real
docker compose logs -f

# logs apenas do backend
docker compose logs -f backend

# logs apenas do banco de dados
docker compose logs -f db
```

## Parando o ambiente

```bash
# para os containers (mantém os dados do banco no volume)
docker compose down

# para os containers e remove também o volume de dados do banco
docker compose down -v
```

## Executando comandos, migrations e scripts no container

```bash
# shell dentro do container do backend
docker compose exec backend sh

# rodar um script npm (ex.: lint, testes) dentro do container
docker compose exec backend npm run lint
docker compose exec backend npm run test

# acessar o psql do banco de dados
docker compose exec db psql -U postgres -d arte_suave_gestao
```

O banco é gerenciado pelo Prisma (`prisma/schema.prisma`). O container aplica as migrations pendentes ao subir. Para criar uma nova migration depois de alterar o schema:

```bash
docker compose exec backend npx prisma migrate dev --name descricao_da_mudanca
```

> Bancos criados antes da troca do TypeORM pelo Prisma: o mais simples é recriar com `docker compose down -v` (isso também renova o volume de `node_modules`). Para manter os dados, alinhe o banco e marque a migration inicial como aplicada:
>
> ```bash
> docker compose exec backend sh -c "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > /tmp/align.sql && npx prisma db execute --file /tmp/align.sql && npx prisma migrate resolve --applied 0_init"
> ```

## Build de produção

O `Dockerfile` do backend usa multi-stage build. A imagem de produção (`target: production`) compila o TypeScript, instala apenas dependências de produção e roda como usuário não-root:

```bash
docker build --target production -t arte-suave-backend:latest ./backend
```
