import { ConfiguracaoRepository } from "../repositories/ConfiguracaoRepository.js";

export type DadosConfiguracao = {
  aliquotaImposto: number;
  coeficienteDepreciacao: number;
  versao?: number;
};

const PADRAO = { aliquotaImposto: 0, coeficienteDepreciacao: 0.2, versao: 1 };

export class ServicoConfiguracao {
  constructor(private readonly repository = new ConfiguracaoRepository()) {}

  async obter() {
    return (await this.repository.obter()) ?? PADRAO;
  }

  atualizar(dados: DadosConfiguracao) {
    for (const [nome, valor] of Object.entries({
      aliquotaImposto: dados.aliquotaImposto,
      coeficienteDepreciacao: dados.coeficienteDepreciacao,
    })) {
      if (!Number.isFinite(valor) || valor < 0 || valor > 1) {
        throw new Error(nome + " deve estar entre 0 e 1.");
      }
    }
    return this.repository.salvar(dados);
  }

  async calcularDepreciacao(anoFabricacao: number, valorAquisicao: number) {
    if (!Number.isFinite(valorAquisicao) || valorAquisicao < 0) {
      throw new Error("O valor de aquisição deve ser não negativo.");
    }
    const config = await this.obter();
    const anos = Math.max(0, new Date().getFullYear() - anoFabricacao);
    return Math.max(0, valorAquisicao * (1 - Number(config.coeficienteDepreciacao) * anos));
  }
}
