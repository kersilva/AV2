import type {
  ConfiguracaoRepository as IConfiguracaoRepository,
  Configuracao,
  DadosConfiguracao,
} from '@domain/repositories/ConfiguracaoRepository.js';
import type { Prisma } from '@/generated/prisma/client.js';
import { prisma } from '@infra/database.js';
export class PrismaConfiguracaoRepository implements IConfiguracaoRepository {
  constructor(
    private readonly db: Pick<Prisma.TransactionClient, 'configuracaoSistema'> = prisma
  ) {}

  async buscarPorId(id: number): Promise<Configuracao | null> {
    const item = await this.db.configuracaoSistema.findUnique({ where: { id } });
    return item
      ? {
          aliquotaImposto: Number(item.aliquotaImposto),
          coeficienteDepreciacao: Number(item.coeficienteDepreciacao),
          versao: item.versao,
        }
      : null;
  }

  async criar(dados: DadosConfiguracao): Promise<Configuracao> {
    const item = await this.db.configuracaoSistema.create({
      data: { id: 1, ...dados },
    });
    return {
      aliquotaImposto: Number(item.aliquotaImposto),
      coeficienteDepreciacao: Number(item.coeficienteDepreciacao),
      versao: item.versao,
    };
  }

  async atualizar(
    id: number,
    versao: number,
    dados: DadosConfiguracao
  ): Promise<Configuracao | null> {
    const result = await this.db.configuracaoSistema.updateMany({
      where: { id, versao },
      data: { ...dados, versao: { increment: 1 } },
    });
    return result.count ? this.buscarPorId(id) : null;
  }
  contar(): Promise<number> {
    return this.db.configuracaoSistema.count();
  }
}
