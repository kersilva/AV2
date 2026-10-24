/*
  Warnings:

  - You are about to drop the column `versao` on the `ClausulaContrato` table. All the data in the column will be lost.
  - You are about to drop the column `versao` on the `JournalTransacao` table. All the data in the column will be lost.
  - You are about to drop the column `salt` on the `Usuario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[loteId,posicaoNoLote]` on the table `Equipamento` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClausulaContrato" DROP COLUMN "versao";

-- AlterTable
ALTER TABLE "JournalTransacao" DROP COLUMN "versao";

-- AlterTable
ALTER TABLE "Lote" ALTER COLUMN "observacoes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Movimentacao" ALTER COLUMN "observacao" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "salt",
ALTER COLUMN "ultimoAcesso" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_loteId_posicaoNoLote_key" ON "Equipamento"("loteId", "posicaoNoLote");

-- CreateIndex
CREATE INDEX "Lote_organizacaoId_idx" ON "Lote"("organizacaoId");

-- CreateIndex
CREATE INDEX "Movimentacao_equipamentoId_idx" ON "Movimentacao"("equipamentoId");
