import type { Prisma } from "@/generated/prisma/client.js";
import { StatusLote } from "@domain/enums/StatusLote.js";
import { EstadoFisico } from "@domain/enums/EstadoFisico.js";
import { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
import { TipoEquipamento } from "@domain/enums/TipoEquipamento.js";
import { Equipamento } from "@domain/entities/Equipamento.js";
import type { EquipamentoPersistido } from "@domain/entities/Equipamento.js";
import { Lote } from "@domain/entities/Lote.js";
import type { LotePersistido } from "@domain/entities/Lote.js";
import type { LoteRepository as ILoteRepository } from "@domain/repositories/LoteRepository.js";
import type { EstadoExclusao } from "@domain/repositories/SoftDeleteRepository.js";
import { prisma } from "@infra/database.js";

function mapLote(row: any): Lote {
  const equipamentos = row.equipamentos.map((item: any) => Equipamento.reconstituir({
    id: item.id, codigoBarrasInterno: item.codigoBarrasInterno,
    tipo: item.tipo as TipoEquipamento, marca: item.marca, modelo: item.modelo,
    anoFabricacao: item.anoFabricacao, estadoFisico: item.estadoFisico as EstadoFisico,
    pesoQuilogramas: Number(item.pesoQuilogramas), loteId: item.loteId,
    posicaoNoLote: item.posicaoNoLote,
    statusRastreamento: item.statusRastreamento as StatusRastreamento,
    versao: item.versao,
  }));
  const lote: LotePersistido = {
    id: row.id, dataEntrada: row.dataEntrada, organizacaoId: row.organizacaoId,
    notaFiscal: row.notaFiscal, transportadora: row.transportadora,
    statusProcessamento: row.statusProcessamento as StatusLote,
    observacoes: row.observacoes, versao: row.versao,
  };
  return Lote.reconstituir(lote, equipamentos);
}

const include = { equipamentos: { where: { excluidoEm: null } } } as const;

export class PrismaLoteRepository implements ILoteRepository {
  async buscarPorId(id: string): Promise<Lote | null> {
    const row = await prisma.lote.findFirst({ where: { id, excluidoEm: null }, include });
    return row ? mapLote(row) : null;
  }

  async listar(): Promise<Lote[]> {
    const rows = await prisma.lote.findMany({
      where: { excluidoEm: null }, include, orderBy: { dataEntrada: "desc" },
    });
    return rows.map(mapLote);
  }

  async criar(lote: Lote): Promise<Lote> {
    const data = lote.toPrisma();
    const row = await prisma.lote.create({
      data: { ...data, excluidoEm: null } as unknown as Prisma.LoteUncheckedCreateInput,
      include,
    });
    return mapLote(row);
  }

  async salvar(lote: Lote, versao: number): Promise<Lote | null> {
    const data = lote.toPrisma();
    const result = await prisma.lote.updateMany({
      where: { id: lote.id, versao, excluidoEm: null },
      data: { statusProcessamento: data.statusProcessamento, versao: { increment: 1 } },
    });
    return result.count ? this.buscarPorId(lote.id) : null;
  }

  async obterEstadoExclusao(id: string): Promise<EstadoExclusao | null> {
    return prisma.lote.findUnique({ where: { id }, select: { id: true, excluidoEm: true, versao: true } });
  }

  async excluir(id: string, versao: number, data: Date): Promise<boolean> {
    const result = await prisma.lote.updateMany({
      where: { id, versao, excluidoEm: null },
      data: { excluidoEm: data, versao: { increment: 1 } },
    });
    return result.count > 0;
  }

  async reativar(id: string, versao: number): Promise<boolean> {
    const result = await prisma.lote.updateMany({
      where: { id, versao, excluidoEm: { not: null } },
      data: { excluidoEm: null, versao: { increment: 1 } },
    });
    return result.count > 0;
  }

  async organizacaoAtiva(id: string): Promise<boolean> {
    return (await prisma.organizacao.count({ where: { id, excluidoEm: null } })) > 0;
  }

  async organizacaoIdDoLote(id: string): Promise<string | null> {
    const lote = await prisma.lote.findUnique({ where: { id }, select: { organizacaoId: true } });
    return lote?.organizacaoId ?? null;
  }

  async possuiEquipamentosAtivos(id: string): Promise<boolean> {
    return (await prisma.equipamento.count({ where: { loteId: id, excluidoEm: null } })) > 0;
  }

  contar(): Promise<number> {
    return prisma.lote.count({ where: { excluidoEm: null } });
  }
}
