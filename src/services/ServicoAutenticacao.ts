import { createHash, randomBytes } from "node:crypto";
import { Credencial } from "../domain/entities/Credencial.js";
import { Sessao } from "../domain/entities/Sessao.js";
import { PapelUsuario } from "../domain/enums/PapelUsuario.js";
import type { Autenticavel } from "../domain/interfaces/Autenticavel.js";

export class ServicoAutenticacao implements Autenticavel {
  private readonly credenciais = new Map<string, Credencial>();
  private readonly sessoes = new Map<string, Sessao>();

  cadastrar(credencial: Credencial): void {
    if (this.credenciais.has(credencial.usuario))
      throw new Error("Usuário já cadastrado.");
    this.credenciais.set(credencial.usuario, credencial);
  }

  criarCredencial(
    usuario: string,
    senha: string,
    papel: PapelUsuario,
  ): Credencial {
    if (!usuario.trim() || senha.length < 8)
      throw new Error("Usuário obrigatório e senha com ao menos 8 caracteres.");
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt).update(senha).digest("hex");
    const credencial = new Credencial(usuario, hash, salt, new Date(), papel);
    this.cadastrar(credencial);
    return credencial;
  }

  autenticar(usuario: string, senha: string): boolean {
    const credencial = this.credenciais.get(usuario);
    if (!credencial) return false;
    if (!credencial.verificarSenha(senha)) return false;
    credencial.atualizarUltimoAcesso();
    const token = randomBytes(32).toString("hex");
    const agora = new Date();
    this.sessoes.set(
      usuario,
      new Sessao(
        token,
        usuario,
        credencial.papel,
        agora,
        new Date(agora.getTime() + 30 * 60 * 1000),
      ),
    );
    return true;
  }

  renovarToken(): string {
    const sessao = [...this.sessoes.values()].at(-1);
    if (!sessao || !sessao.isValida())
      throw new Error("Não há sessão válida para renovar.");
    sessao.renovar();
    return sessao.token;
  }

  logout(token: string): void {
    for (const [usuario, sessao] of this.sessoes) {
      if (sessao.token === token) this.sessoes.delete(usuario);
    }
  }

  obterSessao(usuario: string): Sessao | undefined {
    const sessao = this.sessoes.get(usuario);
    return sessao?.isValida() ? sessao : undefined;
  }

  renovarSessaoPorAtividade(usuario: string): boolean {
    const sessao = this.sessoes.get(usuario);
    if (!sessao || !sessao.isValida()) {
      this.sessoes.delete(usuario);
      return false;
    }
    sessao.renovar();
    return true;
  }
}
