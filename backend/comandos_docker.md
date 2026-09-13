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

> Quando o projeto adicionar um ORM com migrations (ex.: TypeORM/Prisma), rode o comando de migration através do `docker compose exec backend ...` acima, para garantir que ele use a mesma rede e variáveis de ambiente do container.

## Build de produção

O `Dockerfile` do backend usa multi-stage build. A imagem de produção (`target: production`) compila o TypeScript, instala apenas dependências de produção e roda como usuário não-root:

```bash
docker build --target production -t arte-suave-backend:latest ./backend
```
