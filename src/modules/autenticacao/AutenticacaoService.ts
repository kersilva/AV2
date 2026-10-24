import { randomUUID } from "node:crypto";
import type { PapelUsuario } from "@/generated/prisma/enums.js";
import { criarHashSenha, verificarHashSenha } from "@infra/senha.js";
import { AutenticacaoRepository } from "@autenticacao/AutenticacaoRepository.js";

export class ServicoAutenticacao {
  constructor(private readonly repository = new AutenticacaoRepository()) {}

  async criarPrimeiroAdmin(dados: { id: string; usuario: string; senha: string }) {
    if (!dados.usuario.trim() || dados.senha.length < 8) {
      throw new Error("Informe um usuário e uma senha com pelo menos 8 caracteres.");
    }
    if (await this.repository.contarUsuarios() > 0) {
      throw new Error("A configuração inicial já foi concluída.");
    }
    return this.repository.criar({
      id: dados.id || randomUUID(),
      usuario: dados.usuario.trim(),
      hashSenha: await criarHashSenha(dados.senha),
      papel: "ADMINISTRADOR",
    });
  }

  async autenticar(usuario: string, senha: string) {
    const credencial = await this.repository.buscarPorUsuario(usuario);
    if (!credencial || !credencial.ativo || !(await verificarHashSenha(senha, credencial.hashSenha))) {
      return null;
    }

    const atualizado = await this.repository.atualizarUltimoAcesso(credencial.id);
    return { id: atualizado.id, usuario: atualizado.usuario, papel: atualizado.papel };
  }

  async cadastrarUsuario(dados: { id: string; usuario: string; senha: string; papel: PapelUsuario }) {
    if (!dados.usuario.trim() || dados.senha.length < 8) {
      throw new Error("Informe um usuário e uma senha com pelo menos 8 caracteres.");
    }
    return this.repository.criar({
      id: dados.id || randomUUID(),
      usuario: dados.usuario.trim(),
      hashSenha: await criarHashSenha(dados.senha),
      papel: dados.papel,
    });
  }
}
