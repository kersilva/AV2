import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { PapelUsuario } from "../enums/PapelUsuario.js";

export class Credencial {
  private _ultimoAcesso: Date;

  constructor(
    private readonly _usuario: string,
    private _hashSenha: string,
    private readonly _salt: string,
    ultimoAcesso: Date,
    private readonly _papel: PapelUsuario,
  ) {
    this._ultimoAcesso = ultimoAcesso;
  }

  get usuario(): string {
    return this._usuario;
  }
  get hashSenha(): string {
    return this._hashSenha;
  }
  get salt(): string {
    return this._salt;
  }
  get ultimoAcesso(): Date {
    return this._ultimoAcesso;
  }
  get papel(): PapelUsuario {
    return this._papel;
  }

  toJSON(): object {
    return {
      usuario: this.usuario,
      hashSenha: this.hashSenha,
      salt: this.salt,
      ultimoAcesso: this.ultimoAcesso,
      papel: this.papel,
    };
  }

  verificarSenha(senhaPlana: string): boolean {
    const esperado = Buffer.from(this._hashSenha, "hex");
    if (esperado.length === 32) {
      const obtido = createHash("sha256").update(this._salt).update(senhaPlana).digest();
      return timingSafeEqual(esperado, obtido);
    }
    // Migra credenciais scrypt existentes após autenticação bem-sucedida.
    const obtido = scryptSync(senhaPlana, this._salt, esperado.length);
    const valida = (
      esperado.length === obtido.length && timingSafeEqual(esperado, obtido)
    );
    if (valida) this._hashSenha = createHash("sha256").update(this._salt).update(senhaPlana).digest("hex");
    return valida;
  }

  atualizarUltimoAcesso(): void {
    this._ultimoAcesso = new Date();
  }
}
