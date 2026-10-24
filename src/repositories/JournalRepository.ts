import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../infrastructure/database.js";

export class JournalRepository {
  registrar(dados: Prisma.JournalTransacaoUncheckedCreateInput) {
    return prisma.journalTransacao.create({ data: dados });
  }

  listar() {
    return prisma.journalTransacao.findMany({
      orderBy: { timestamp: "desc" },
      take: 500,
    });
  }
}
