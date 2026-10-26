-- DropIndex
DROP INDEX "Contrato_organizacaoId_key";

CREATE UNIQUE INDEX "contrato_organizacao_ativo_key"
  ON "Contrato" ("organizacaoId")
  WHERE "excluidoEm" IS NULL;