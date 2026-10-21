export class Movimentacao {
  constructor(
    private readonly _id: string,
    private readonly _equipamentoId: string,
    private readonly _dataHora: Date,
    private readonly _origem: string,
    private readonly _destino: string,
    private readonly _responsavel: string,
    private readonly _observacao: string,
  ) {}

  get id(): string {
    return this._id;
  }
  get equipamentoId(): string {
    return this._equipamentoId;
  }
  get dataHora(): Date {
    return this._dataHora;
  }
  get origem(): string {
    return this._origem;
  }
  get destino(): string {
    return this._destino;
  }
  get responsavel(): string {
    return this._responsavel;
  }
  get observacao(): string {
    return this._observacao;
  }

  toJSON(): object {
    return {
      id: this.id,
      equipamentoId: this.equipamentoId,
      dataHora: this.dataHora,
      origem: this.origem,
      destino: this.destino,
      responsavel: this.responsavel,
      observacao: this.observacao,
    };
  }
}
