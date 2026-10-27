import { Prisma } from '@/generated/prisma/client.js';
import type { RecursosTransacao, UnitOfWork } from '@domain/services/UnitOfWork.js';
import { prisma } from '@infra/database.js';
import { PrismaJournalWriter } from '@infra/journal/PrismaJournalWriter.js';
import { PrismaConfiguracaoRepository } from '@infra/repositories/PrismaConfiguracaoRepository.js';
import { PrismaContratoRepository } from '@infra/repositories/PrismaContratoRepository.js';
import { PrismaEquipamentoRepository } from '@infra/repositories/PrismaEquipamentoRepository.js';
import { PrismaJournalTransacaoRepository } from '@infra/repositories/PrismaJournalTransacaoRepository.js';
import { PrismaLoteRepository } from '@infra/repositories/PrismaLoteRepository.js';
import { PrismaOrganizacaoRepository } from '@infra/repositories/PrismaOrganizacaoRepository.js';
import { PrismaUsuarioRepository } from '@infra/repositories/PrismaUsuarioRepository.js';

export class PrismaUnitOfWork implements UnitOfWork {
  executar<T>(operacao: (recursos: RecursosTransacao) => Promise<T>): Promise<T> {
    return prisma.$transaction(
      async (transacao) => {
        const journalRepository = new PrismaJournalTransacaoRepository(transacao);

        return operacao({
          organizacoes: new PrismaOrganizacaoRepository(transacao),
          contratos: new PrismaContratoRepository(transacao),
          lotes: new PrismaLoteRepository(transacao),
          equipamentos: new PrismaEquipamentoRepository(transacao),
          usuarios: new PrismaUsuarioRepository(transacao),
          configuracao: new PrismaConfiguracaoRepository(transacao),
          journal: new PrismaJournalWriter(journalRepository),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
