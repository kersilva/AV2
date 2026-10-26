/*
  Warnings:

  - You are about to drop the column `ativo` on the `Organizacao` table. All the data in the column will be lost.
  - Added the required column `excluidoEm` to the `Contrato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `excluidoEm` to the `Equipamento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `excluidoEm` to the `Lote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `excluidoEm` to the `Organizacao` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contrato" ADD COLUMN     "excluidoEm" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN     "excluidoEm" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "excluidoEm" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Organizacao" DROP COLUMN "ativo",
ADD COLUMN     "excluidoEm" TIMESTAMP(3) NOT NULL;
