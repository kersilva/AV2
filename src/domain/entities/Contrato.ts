export class Contrato {
  private _dataVencimento: Date;

  constructor(
    private readonly _id: string,
    private readonly _organizacaoId: string,
    private readonly _dataAssinatura: Date,
    dataVencimento: Date,
    private readonly _clausulas: string[],
    private readonly _valorMensal: number,
    private readonly _renovacaoAutomatica: boolean,
  ) {
    this._dataVencimento = dataVencimento;
  }

  get id(): string {
    return this._id;
  }
  get organizacaoId(): string {
    return this._organizacaoId;
  }
  get dataAssinatura(): Date {
    return this._dataAssinatura;
  }
  get dataVencimento(): Date {
    return this._dataVencimento;
  }
  get clausulas(): string[] {
    return [...this._clausulas];
  }
  get valorMensal(): number {
    return this._valorMensal;
  }
  get renovacaoAutomatica(): boolean {
    return this._renovacaoAutomatica;
  }

  toJSON(): object {
    return {
      id: this.id,
      organizacaoId: this.organizacaoId,
      dataAssinatura: this.dataAssinatura,
      dataVencimento: this.dataVencimento,
      clausulas: this.clausulas,
      valorMensal: this.valorMensal,
      renovacaoAutomatica: this.renovacaoAutomatica,
    };
  }

  estaVigente(): boolean {
    const agora = new Date();
    return this._dataAssinatura <= agora && this._dataVencimento >= agora;
  }

  renovar(novoVencimento: Date): void {
    if (novoVencimento <= this._dataVencimento)
      throw new Error(
        "O novo vencimento deve ser posterior ao vencimento atual.",
      );
    this._dataVencimento = novoVencimento;
  }
}
