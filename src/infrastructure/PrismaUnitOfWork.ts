import { Prisma } from "@/generated/prisma/client.js";
import type {
  RecursosTransacao,
  UnitOfWork,
} from "@domain/services/UnitOfWork.js";
import { prisma } from "@infra/database.js";
import { PrismaJournalWriter } from "@infra/journal/PrismaJournalWriter.js";
import { PrismaEquipamentoRepository } from "@infra/repositories/PrismaEquipamentoRepository.js";
import { PrismaJournalTransacaoRepository } from "@infra/repositories/PrismaJournalTransacaoRepository.js";

export class PrismaUnitOfWork implements UnitOfWork {
  executar<T>(operacao: (recursos: RecursosTransacao) => Promise<T>): Promise<T> {
    return prisma.$transaction(
      async (transacao) => {
        const journalRepository = new PrismaJournalTransacaoRepository(transacao);

        return operacao({
          equipamentos: new PrismaEquipamentoRepository(transacao),
          journal: new PrismaJournalWriter(journalRepository),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
