-- HU011/RF008: critério de agrupamento, dias e horários estruturados e inativação de turmas.
ALTER TABLE "school_groups" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ageRange" VARCHAR NOT NULL DEFAULT '',
ADD COLUMN     "level" VARCHAR NOT NULL DEFAULT '',
ADD COLUMN     "sessions" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "id" SET DEFAULT (gen_random_uuid())::text;
