# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-alpine

# ---------------------------------------------------------------------------
# deps: install full dependency tree (cached while package*.json is unchanged)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# postinstall roda `prisma generate`, que precisa do schema.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# development: hot-reload target used by docker-compose in local dev.
# Runs as root: the source is bind-mounted from the host at runtime, and a
# fixed non-root UID would not be able to write to host-owned files/volumes.
# The production image below (no bind mounts) drops privileges instead.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS development
WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
# O bind mount esconde o client gerado na imagem: gera de novo (devolvendo os arquivos ao
# dono da pasta no host, já que o container roda como root) e aplica as migrations.
CMD ["sh", "-c", "npx prisma generate && chown -R $(stat -c %u:%g /app) src/generated && npx prisma migrate deploy && npm run start:dev"]

# ---------------------------------------------------------------------------
# build: compile TypeScript to dist using the full (dev) dependency tree
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Reinstall with only production dependencies for the final image
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# production: minimal runtime image, non-root user
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS production
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package.json prisma.config.ts ./
COPY --chown=nestjs:nodejs prisma ./prisma

USER nestjs

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
