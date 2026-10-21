import { randomBytes } from "node:crypto";
import { PapelUsuario } from "../enums/PapelUsuario.js";

export class Sessao {
  private _token: string;
  private _expiracao: Date;

  constructor(
    token: string,
    private readonly _usuario: string,
    private readonly _papel: PapelUsuario,
    private readonly _criadoEm: Date,
    expiracao: Date,
  ) {
    this._token = token;
    this._expiracao = expiracao;
  }

  get token(): string {
    return this._token;
  }
  get usuario(): string {
    return this._usuario;
  }
  get papel(): PapelUsuario {
    return this._papel;
  }
  get criadoEm(): Date {
    return this._criadoEm;
  }
  get expiracao(): Date {
    return this._expiracao;
  }

  toJSON(): object {
    return {
      token: this.token,
      usuario: this.usuario,
      papel: this.papel,
      criadoEm: this.criadoEm,
      expiracao: this.expiracao,
    };
  }

  isValida(): boolean {
    return new Date() < this._expiracao;
  }

  renovar(): void {
    this._expiracao = new Date(Date.now() + 30 * 60 * 1000);
    this._token = randomBytes(32).toString("hex");
  }
}
