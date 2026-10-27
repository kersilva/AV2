import type {
  ConfiguracaoRepository,
  Configuracao,
} from '@domain/repositories/ConfiguracaoRepository.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';
import { ErroConflito, ErroValidacao } from '@/shared/errors/DomainError.js';

export type DadosConfiguracao = {
  aliquotaImposto: number;
  coeficienteDepreciacao: number;
  versao?: number;
};

const PADRAO: Configuracao = {
  aliquotaImposto: 0,
  coeficienteDepreciacao: 0.2,
  versao: 1,
};

export class ConfiguracaoService {
  constructor(
    private readonly repository: ConfiguracaoRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async obter() {
    return (await this.repository.buscarPorId(1)) ?? PADRAO;
  }

  async atualizar(dados: DadosConfiguracao, ator: { id: string; usuario: string }) {
    for (const [nome, valor] of Object.entries({
      aliquotaImposto: dados.aliquotaImposto,
      coeficienteDepreciacao: dados.coeficienteDepreciacao,
    })) {
      if (!Number.isFinite(valor) || valor < 0 || valor > 1)
        throw new ErroValidacao(nome + ' deve estar entre 0 e 1.');
    }

    return this.unitOfWork.executar(async ({ configuracao, journal }) => {
      const atual = await configuracao.buscarPorId(1);
      const { versao: versaoInformada, ...valores } = dados;
      let salva: Configuracao | null;
      if (!atual) {
        salva = await configuracao.criar(valores);
      } else {
        if (versaoInformada === undefined)
          throw new ErroValidacao('Informe a versão atual da configuração para atualizá-la.');
        if (versaoInformada !== atual.versao)
          throw new ErroConflito('Conflito de versão da configuração.');
        salva = await configuracao.atualizar(1, versaoInformada, valores);
      }
      if (!salva) throw new ErroConflito('Conflito de versão da configuração.');

      await journal.registrar({
        operacao: atual ? 'ATUALIZAR' : 'CRIAR',
        entidade: 'ConfiguracaoSistema',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        ...(atual ? { dadosAntes: atual } : {}),
        dadosDepois: salva,
      });
      return salva;
    });
  }

  async calcularDepreciacao(anoFabricacao: number, valorAquisicao: number) {
    if (!Number.isFinite(valorAquisicao) || valorAquisicao < 0)
      throw new ErroValidacao('O valor de aquisição deve ser não negativo.');
    const config = await this.obter();
    const anos = Math.max(0, new Date().getFullYear() - anoFabricacao);
    return Math.max(0, valorAquisicao * (1 - config.coeficienteDepreciacao * anos));
  }
}
