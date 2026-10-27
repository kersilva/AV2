import type { PapelUsuario } from '@domain/enums/PapelUsuario.js';
import type { GeradorHash } from '@domain/services/GeradorHash.js';
import { ValidadorSenha } from '@domain/validators/ValidadorSenha.js';
import { ErroValidacao } from '@/shared/errors/DomainError.js';

export type CredencialPersistida = {
  id: string;
  usuario: string;
  hashSenha: string;
  ultimoAcesso: Date | null;
  papel: PapelUsuario;
  ativo: boolean;
  versao: number;
};

export type NovaCredencial = {
  id: string;
  usuario: string;
  senha: string;
  papel: PapelUsuario;
};

export class Credencial {
  private constructor(
    private readonly _id: string,
    private readonly _usuario: string,
    private _hashSenha: string,
    private _ultimoAcesso: Date | null,
    private _papel: PapelUsuario,
    private _ativo: boolean,
    private _versao: number
  ) {}

  static async criar(dados: NovaCredencial, geradorHash: GeradorHash): Promise<Credencial> {
    const usuario = dados.usuario.trim();
    if (!dados.id.trim() || !usuario) {
      throw new ErroValidacao('Informe um identificador e um usuário.');
    }

    const validadorSenha = new ValidadorSenha();
    if (!validadorSenha.validar(dados.senha)) {
      throw new ErroValidacao(validadorSenha.obterMensagemErro());
    }
    const hash = await geradorHash.gerar(dados.senha);
    return new Credencial(dados.id, usuario, hash, null, dados.papel, true, 1);
  }

  static reconstituir(dados: CredencialPersistida): Credencial {
    return new Credencial(
      dados.id,
      dados.usuario,
      dados.hashSenha,
      dados.ultimoAcesso,
      dados.papel,
      dados.ativo,
      dados.versao
    );
  }

  get id(): string {
    return this._id;
  }
  get usuario(): string {
    return this._usuario;
  }
  get hashSenha(): string {
    return this._hashSenha;
  }
  get ultimoAcesso(): Date | null {
    return this._ultimoAcesso;
  }
  get papel(): PapelUsuario {
    return this._papel;
  }
  get ativo(): boolean {
    return this._ativo;
  }
  get versao(): number {
    return this._versao;
  }

  async verificarSenha(senha: string, geradorHash: GeradorHash): Promise<boolean> {
    return geradorHash.verificar(senha, this._hashSenha);
  }

  async migrarHash(senha: string, geradorHash: GeradorHash): Promise<boolean> {
    if (!geradorHash.precisaMigrar(this._hashSenha)) return false;
    if (!(await this.verificarSenha(senha, geradorHash))) return false;
    if (new TextEncoder().encode(senha).length > 72) return false;
    this._hashSenha = await geradorHash.gerar(senha);
    return true;
  }

  atualizarUltimoAcesso(data: Date = new Date()): void {
    this._ultimoAcesso = data;
  }

  alterarPapel(papel: PapelUsuario): void {
    this._papel = papel;
  }

  ativar(): void {
    this._ativo = true;
  }
  desativar(): void {
    this._ativo = false;
  }

  incrementarVersao(): void {
    this._versao += 1;
  }

  toPrisma(): CredencialPersistida {
    return {
      id: this._id,
      usuario: this._usuario,
      hashSenha: this._hashSenha,
      ultimoAcesso: this._ultimoAcesso,
      papel: this._papel,
      ativo: this._ativo,
      versao: this._versao,
    };
  }
}
