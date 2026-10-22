-- HU018 / RN011: identificação obrigatória do doador/patrocinador e destino/beneficiado em PATROCINIO_DOACAO.
ALTER TABLE "revenues" ADD COLUMN "donor" VARCHAR(80);
ALTER TABLE "revenues" ADD COLUMN "beneficiary" VARCHAR(80);
