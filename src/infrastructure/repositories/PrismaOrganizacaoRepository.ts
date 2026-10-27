import type { Prisma } from '@/generated/prisma/client.js';
import type {
  OrganizacaoRepository as IOrganizacaoRepository,
  OrganizacaoRegistro,
  NovaOrganizacao,
} from '@domain/repositories/OrganizacaoRepository.js';
import type { EstadoExclusao } from '@domain/repositories/SoftDeleteRepository.js';
import { prisma } from '@infra/database.js';

export class PrismaOrganizacaoRepository implements IOrganizacaoRepository {
  constructor(
    private readonly db: Pick<
      Prisma.TransactionClient,
      'organizacao' | 'contrato' | 'lote'
    > = prisma
  ) {}

  async buscarPorId(id: string): Promise<OrganizacaoRegistro | null> {
    return this.db.organizacao.findFirst({ where: { id, excluidoEm: null } });
  }

  async listar(): Promise<OrganizacaoRegistro[]> {
    return this.db.organizacao.findMany({
      where: { excluidoEm: null },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  async criar(dados: NovaOrganizacao): Promise<OrganizacaoRegistro> {
    return this.db.organizacao.create({ data: { ...dados, excluidoEm: null } });
  }

  async atualizar(
    id: string,
    versao: number,
    dados: Partial<NovaOrganizacao>
  ): Promise<OrganizacaoRegistro | null> {
    const resultado = await this.db.organizacao.updateMany({
      where: { id, versao, excluidoEm: null },
      data: { ...dados, versao: { increment: 1 } },
    });
    if (!resultado.count) return null;
    return this.buscarPorId(id);
  }

  async obterEstadoExclusao(id: string): Promise<EstadoExclusao | null> {
    return this.db.organizacao.findUnique({
      where: { id },
      select: { id: true, excluidoEm: true, versao: true },
    });
  }

  async excluir(id: string, versao: number, data: Date): Promise<boolean> {
    const resultado = await this.db.organizacao.updateMany({
      where: { id, versao, excluidoEm: null },
      data: { excluidoEm: data, versao: { increment: 1 } },
    });
    return resultado.count > 0;
  }

  async reativar(id: string, versao: number): Promise<boolean> {
    const resultado = await this.db.organizacao.updateMany({
      where: { id, versao, excluidoEm: { not: null } },
      data: { excluidoEm: null, versao: { increment: 1 } },
    });
    return resultado.count > 0;
  }

  async temVinculosAtivos(id: string): Promise<boolean> {
    const [contratos, lotes] = await Promise.all([
      this.db.contrato.count({ where: { organizacaoId: id, excluidoEm: null } }),
      this.db.lote.count({ where: { organizacaoId: id, excluidoEm: null } }),
    ]);
    return contratos > 0 || lotes > 0;
  }

  contar(): Promise<number> {
    return this.db.organizacao.count({ where: { excluidoEm: null } });
  }
}
