import { Prisma } from "@/generated/prisma/client.js";
import type {
  FiltroJournalTransacao,
  JournalTransacaoRecord,
  JournalTransacaoRepository,
  ResultadoJournalTransacao,
} from "@domain/repositories/JournalTransacaoRepository.js";
import { prisma } from "@infra/database.js";
function where(
  filtro: FiltroJournalTransacao,
): Prisma.JournalTransacaoWhereInput {
  return {
    ...(filtro.operacao ? { operacao: filtro.operacao } : {}),
    ...(filtro.entidade ? { entidade: filtro.entidade } : {}),
    ...(filtro.usuarioId ? { usuarioId: filtro.usuarioId } : {}),
    ...(filtro.inicio || filtro.fim
      ? {
          timestamp: {
            ...(filtro.inicio ? { gte: filtro.inicio } : {}),
            ...(filtro.fim ? { lte: filtro.fim } : {}),
          },
        }
      : {}),
  };
}
export class PrismaJournalTransacaoRepository implements JournalTransacaoRepository {
  async criar(dados: JournalTransacaoRecord): Promise<JournalTransacaoRecord> {
    return (await prisma.journalTransacao.create({
      data: {
        id: dados.id,
        timestamp: dados.timestamp,
        operacao: dados.operacao,
        entidade: dados.entidade,
        usuarioResponsavel: dados.usuarioResponsavel,
        usuarioId: dados.usuarioId,
        dadosAntes:
          dados.dadosAntes === null
            ? Prisma.JsonNull
            : (dados.dadosAntes as Prisma.InputJsonValue),
        dadosDepois:
          dados.dadosDepois === null
            ? Prisma.JsonNull
            : (dados.dadosDepois as Prisma.InputJsonValue),
      },
    })) as unknown as JournalTransacaoRecord;
  }
  async listar(
    filtro: FiltroJournalTransacao,
  ): Promise<ResultadoJournalTransacao> {
    const condicao = where(filtro);
    const [itens, total] = await Promise.all([
      prisma.journalTransacao.findMany({
        where: condicao,
        orderBy: { timestamp: "desc" },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      prisma.journalTransacao.count({ where: condicao }),
    ]);
    return { itens: itens as unknown as JournalTransacaoRecord[], total };
  }
}
