export class JournalTransacao {
  constructor(
    private readonly _id: string,
    private readonly _timestamp: Date,
    private readonly _operacao: string,
    private readonly _entidade: string,
    private readonly _dadosAntes: any,
    private readonly _dadosDepois: any,
    private readonly _usuarioResponsavel: string,
  ) {}

  get id(): string {
    return this._id;
  }
  get timestamp(): Date {
    return this._timestamp;
  }
  get operacao(): string {
    return this._operacao;
  }
  get entidade(): string {
    return this._entidade;
  }
  get dadosAntes(): any {
    return this._dadosAntes;
  }
  get dadosDepois(): any {
    return this._dadosDepois;
  }
  get usuarioResponsavel(): string {
    return this._usuarioResponsavel;
  }

  toJSON(): object {
    return {
      id: this.id,
      timestamp: this.timestamp,
      operacao: this.operacao,
      entidade: this.entidade,
      dadosAntes: this.dadosAntes,
      dadosDepois: this.dadosDepois,
      usuarioResponsavel: this.usuarioResponsavel,
    };
  }

  registrar(): void {
    if (
      !this._id ||
      !this._operacao ||
      !this._entidade ||
      !this._usuarioResponsavel
    ) {
      throw new Error("Transação sem os dados obrigatórios de auditoria.");
    }
    if (Number.isNaN(this._timestamp.getTime()))
      throw new Error("Data da transação inválida.");
  }

  reverter(): boolean {
    return this._dadosAntes !== undefined;
  }
}
