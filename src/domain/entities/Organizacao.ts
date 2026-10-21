import { Contrato } from "./Contrato.js";

export class Organizacao {
  private _enderecoCompleto: string;
  private _ativo: boolean;

  constructor(
    private readonly _id: string,
    private readonly _razaoSocial: string,
    private readonly _cnpj: string,
    private readonly _inscricaoEstadual: string,
    enderecoCompleto: string,
    private readonly _telefone: string,
    private readonly _email: string,
    private readonly _dataCadastro: Date,
    ativo: boolean,
    private readonly _contratoVigente: Contrato,
  ) {
    this._enderecoCompleto = enderecoCompleto;
    this._ativo = ativo;
  }

  get id(): string {
    return this._id;
  }
  get razaoSocial(): string {
    return this._razaoSocial;
  }
  get cnpj(): string {
    return this._cnpj;
  }
  get inscricaoEstadual(): string {
    return this._inscricaoEstadual;
  }
  get enderecoCompleto(): string {
    return this._enderecoCompleto;
  }
  get telefone(): string {
    return this._telefone;
  }
  get email(): string {
    return this._email;
  }
  get dataCadastro(): Date {
    return this._dataCadastro;
  }
  get ativo(): boolean {
    return this._ativo;
  }
  get contratoVigente(): Contrato {
    return this._contratoVigente;
  }

  toJSON(): object {
    return {
      id: this.id,
      razaoSocial: this.razaoSocial,
      cnpj: this.cnpj,
      inscricaoEstadual: this.inscricaoEstadual,
      enderecoCompleto: this.enderecoCompleto,
      telefone: this.telefone,
      email: this.email,
      dataCadastro: this.dataCadastro,
      ativo: this.ativo,
      contratoVigente: this.contratoVigente,
    };
  }

  alterarEndereco(novoEndereco: string): void {
    if (!novoEndereco.trim()) throw new Error("O endereço não pode ser vazio.");
    this._enderecoCompleto = novoEndereco.trim();
  }

  desativar(): void {
    this._ativo = false;
  }
}
