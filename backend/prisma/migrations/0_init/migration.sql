-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "users_role_enum" AS ENUM ('ADMINISTRADOR', 'RESPONSAVEL', 'ATLETA_MAIOR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "birthDate" DATE NOT NULL,
    "role" "users_role_enum" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "contactEmails" JSONB NOT NULL DEFAULT '[]',
    "phones" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "birthDate" DATE NOT NULL,
    "emails" JSONB NOT NULL DEFAULT '[]',
    "phones" JSONB NOT NULL DEFAULT '[]',
    "groupId" VARCHAR(80) NOT NULL,
    "belt" VARCHAR NOT NULL DEFAULT 'Branca',
    "attendance" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "accountId" UUID,
    "guardianId" UUID,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_groups" (
    "id" VARCHAR(80) NOT NULL,
    "name" VARCHAR NOT NULL,
    "schedule" VARCHAR NOT NULL,

    CONSTRAINT "school_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_accountId_key" ON "students"("accountId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "school_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;


-- Garante no banco que existe no máximo um superadmin (índice parcial, não modelável no schema.prisma).
CREATE UNIQUE INDEX "UQ_users_single_superadmin" ON "users"("isSuperAdmin") WHERE "isSuperAdmin" = true;
