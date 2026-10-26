import type { Prisma } from "@/generated/prisma/client.js";
import type { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
import type { LoteRelatorio, ContratoRelatorio, EquipamentoRelatorio, PeriodoRelatorio } from "@relatorio/RelatorioTypes.js";
import { prisma } from "@infra/database.js";

export class RelatorioQueryService {
  async lotesDaOrganizacao(organizacaoId: string, periodo: PeriodoRelatorio = {}): Promise<LoteRelatorio[]> {
    const where: Prisma.LoteWhereInput = {
      organizacaoId,
      excluidoEm: null,
      organizacao: { is: { excluidoEm: null } },
      ...(periodo.inicio || periodo.fim ? { dataEntrada: {
        ...(periodo.inicio ? { gte: periodo.inicio } : {}),
        ...(periodo.fim ? { lte: periodo.fim } : {}),
      } } : {}),
    };
    const rows = await prisma.lote.findMany({
      where,
      include: { _count: { select: { equipamentos: { where: { excluidoEm: null } } } } },
      orderBy: { dataEntrada: "asc" },
    });
    return rows.map(row => ({ id: row.id, organizacaoId: row.organizacaoId, dataEntrada: row.dataEntrada, _count: row._count }));
  }

  async equipamentosPorStatus(status: StatusRastreamento): Promise<EquipamentoRelatorio[]> {
    return (await prisma.equipamento.findMany({
      where: { statusRastreamento: status, excluidoEm: null, lote: { is: { excluidoEm: null } } },
      select: { id: true, codigoBarrasInterno: true, loteId: true },
      orderBy: { id: "asc" },
    })) as EquipamentoRelatorio[];
  }

  async contratosNoPeriodo(periodo: PeriodoRelatorio = {}): Promise<ContratoRelatorio[]> {
    const rows = await prisma.contrato.findMany({
      where: {
        excluidoEm: null,
        organizacao: { is: { excluidoEm: null } },
        ...(periodo.inicio || periodo.fim ? { AND: [
          ...(periodo.fim ? [{ dataAssinatura: { lte: periodo.fim } }] : []),
          ...(periodo.inicio ? [{ dataVencimento: { gte: periodo.inicio } }] : []),
        ] } : {}),
      },
      select: { id: true, organizacaoId: true, valorMensal: true },
    });
    return rows.map(row => ({ id: row.id, organizacaoId: row.organizacaoId, valorMensal: Number(row.valorMensal) }));
  }
}
