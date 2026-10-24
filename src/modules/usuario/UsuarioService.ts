import { UsuarioRepository } from "@usuario/UsuarioRepository.js";
import { criarHashSenha } from "@infra/senha.js";
import type { PapelUsuario } from "@/generated/prisma/enums.js";

export class UsuarioService {
  constructor(private readonly repository = new UsuarioRepository()) {}

  listar() {
    return this.repository.listar();
  }

  async cadastrar(dados: { id: string; usuario: string; senha: string; papel: PapelUsuario }) {
    if (!dados.usuario.trim() || dados.senha.length < 8) {
      throw new Error("Informe um usuário e uma senha com pelo menos 8 caracteres.");
    }
    return this.repository.criar({
      id: dados.id,
      usuario: dados.usuario.trim(),
      hashSenha: await criarHashSenha(dados.senha),
      papel: dados.papel,
    });
  }

  alterarAtivo(id: string, ativo: boolean, versao: number) {
    return this.repository.alterarAtivo(id, ativo, versao);
  }

  alterarPapel(id: string, papel: PapelUsuario, versao: number) {
    return this.repository.alterarPapel(id, papel, versao);
  }

  deletar(id: string, versao: number) {
    return this.repository.deletar(id, versao);
  }
}
