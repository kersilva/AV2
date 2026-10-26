-- DropForeignKey
ALTER TABLE "JournalTransacao" DROP CONSTRAINT "JournalTransacao_usuarioId_fkey";

-- AddForeignKey
ALTER TABLE "JournalTransacao" ADD CONSTRAINT "JournalTransacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
