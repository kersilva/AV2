import { Contrato } from '@domain/entities/Contrato.js';
import type { Prisma } from '@/generated/prisma/client.js';
import type { ContratoPersistido } from '@domain/entities/Contrato.js';
import type { ContratoRepository as IContratoRepository } from '@domain/repositories/ContratoRepository.js';
import type { EstadoExclusao } from '@domain/repositories/SoftDeleteRepository.js';
import { prisma } from '@infra/database.js';

const incluirClausulas = {
  clausulas: { orderBy: { ordem: 'asc' as const } },
} as const;

function mapContrato(row: any): Contrato {
  const dados: ContratoPersistido = {
    id: row.id,
    organizacaoId: row.organizacaoId,
    dataAssinatura: row.dataAssinatura,
    dataVencimento: row.dataVencimento,
    clausulas: row.clausulas.map((clausula: { texto: string }) => clausula.texto),
    valorMensal: Number(row.valorMensal),
    renovacaoAutomatica: row.renovacaoAutomatica,
    versao: row.versao,
    excluidoEm: row.excluidoEm,
  };
  return Contrato.reconstituir(dados);
}

export class PrismaContratoRepository implements IContratoRepository {
  constructor(
    private readonly db: Pick<Prisma.TransactionClient, 'contrato' | 'organizacao'> = prisma
  ) {}

  async buscarPorId(id: string): Promise<Contrato | null> {
    const row = await this.db.contrato.findFirst({
      where: { id, excluidoEm: null },
      include: incluirClausulas,
    });
    return row ? mapContrato(row) : null;
  }

  async listar(): Promise<Contrato[]> {
    const rows = await this.db.contrato.findMany({
      where: { excluidoEm: null },
      include: incluirClausulas,
      orderBy: { dataAssinatura: 'desc' },
    });
    return rows.map(mapContrato);
  }

  async criar(contrato: Contrato): Promise<Contrato> {
    const dados = contrato.toPrisma();
    const row = await this.db.contrato.create({
      data: {
        id: dados.id,
        dataAssinatura: dados.dataAssinatura,
        dataVencimento: dados.dataVencimento,
        valorMensal: dados.valorMensal,
        renovacaoAutomatica: dados.renovacaoAutomatica,
        excluidoEm: null,
        organizacao: { connect: { id: dados.organizacaoId } },
        clausulas: {
          create: dados.clausulas.map((texto, indice) => ({
            ordem: indice + 1,
            texto,
          })),
        },
      },
      include: incluirClausulas,
    });
    return mapContrato(row);
  }

  async obterEstadoExclusao(id: string): Promise<EstadoExclusao | null> {
    return this.db.contrato.findUnique({
      where: { id },
      select: { id: true, excluidoEm: true, versao: true },
    });
  }

  async excluir(id: string, versao: number, data: Date): Promise<boolean> {
    const result = await this.db.contrato.updateMany({
      where: { id, versao, excluidoEm: null },
      data: { excluidoEm: data, versao: { increment: 1 } },
    });
    return result.count > 0;
  }

  async reativar(id: string, versao: number): Promise<boolean> {
    const result = await this.db.contrato.updateMany({
      where: { id, versao, excluidoEm: { not: null } },
      data: { excluidoEm: null, versao: { increment: 1 } },
    });
    return result.count > 0;
  }

  async organizacaoAtiva(id: string): Promise<boolean> {
    return (await this.db.organizacao.count({ where: { id, excluidoEm: null } })) > 0;
  }

  async organizacaoIdDoContrato(id: string): Promise<string | null> {
    const contrato = await this.db.contrato.findUnique({
      where: { id },
      select: { organizacaoId: true },
    });
    return contrato?.organizacaoId ?? null;
  }

  async existeAtivoParaOrganizacao(organizacaoId: string): Promise<boolean> {
    return (
      (await this.db.contrato.count({
        where: { organizacaoId, excluidoEm: null },
      })) > 0
    );
  }

  async atualizarVencimento(id: string, versao: number, novoVencimento: Date): Promise<boolean> {
    const result = await this.db.contrato.updateMany({
      where: { id, versao, excluidoEm: null },
      data: { dataVencimento: novoVencimento, versao: { increment: 1 } },
    });
    return result.count > 0;
  }

  contar(): Promise<number> {
    return this.db.contrato.count({ where: { excluidoEm: null } });
  }
}
