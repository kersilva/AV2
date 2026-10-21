export interface ConfiguracaoSistema {
  aliquotaImposto: number;
  coeficienteDepreciacao: number;
}

export class ServicoConfiguracao {
  private _aliquotaImposto = 0;
  private _coeficienteDepreciacao = 0.2;

  get aliquotaImposto(): number { return this._aliquotaImposto; }
  get coeficienteDepreciacao(): number { return this._coeficienteDepreciacao; }

  carregar(configuracao: Partial<ConfiguracaoSistema> | null): void {
    if (!configuracao) return;
    if (configuracao.aliquotaImposto !== undefined) this.definirAliquotaImposto(configuracao.aliquotaImposto);
    if (configuracao.coeficienteDepreciacao !== undefined) this.definirCoeficienteDepreciacao(configuracao.coeficienteDepreciacao);
  }

  definirAliquotaImposto(valor: number): void {
    if (!Number.isFinite(valor) || valor < 0 || valor > 1) throw new Error("A alíquota deve estar entre 0 e 1 (0% a 100%).");
    this._aliquotaImposto = valor;
  }

  definirCoeficienteDepreciacao(valor: number): void {
    if (!Number.isFinite(valor) || valor < 0 || valor > 1) throw new Error("O coeficiente de depreciação deve estar entre 0 e 1.");
    this._coeficienteDepreciacao = valor;
  }

  calcularDepreciacao(anoFabricacao: number, valorAquisicao: number): number {
    const anos = Math.max(0, new Date().getFullYear() - anoFabricacao);
    return Math.max(0, valorAquisicao * (1 - this._coeficienteDepreciacao * anos));
  }
}
