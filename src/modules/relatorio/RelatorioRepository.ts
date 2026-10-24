import type { StatusRastreamento } from "@/generated/prisma/enums.js";
import { prisma } from "@infra/database.js";

export class RelatorioRepository {
  lotesDaOrganizacao(organizacaoId: string, inicio?: Date, fim?: Date) {
    return prisma.lote.findMany({
      where: {
        organizacaoId,
        ...(inicio || fim ? { dataEntrada: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) } } : {}),
      },
      include: { _count: { select: { equipamentos: true } } },
      orderBy: { dataEntrada: "asc" },
    });
  }

  equipamentosPorStatus(status: StatusRastreamento) {
    return prisma.equipamento.findMany({
      where: { statusRastreamento: status },
      select: { id: true, codigoBarrasInterno: true, loteId: true },
      orderBy: { id: "asc" },
    });
  }

  contratosNoPeriodo(inicio?: Date, fim?: Date) {
    return prisma.contrato.findMany({
      where: {
        ...(inicio || fim ? { AND: [
          ...(fim ? [{ dataAssinatura: { lte: fim } }] : []),
          ...(inicio ? [{ dataVencimento: { gte: inicio } }] : []),
        ] } : {}),
      },
      select: { id: true, organizacaoId: true, valorMensal: true },
    });
  }
}
