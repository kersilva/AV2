import type { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import type { UsuarioRepository } from "@domain/repositories/UsuarioRepository.js";
import { ErroAutenticacao, ErroPermissao } from "@/shared/errors/DomainError.js";

export class AutorizacaoService {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async verificarAcesso(usuarioId: string, papeisPermitidos: PapelUsuario[]): Promise<void> {
    const usuario = await this.usuarios.buscarDadosAutorizacao(usuarioId);

    if (!usuario?.ativo) {
      throw new ErroAutenticacao("Usuário inativo ou inexistente.");
    }

    if (!papeisPermitidos.includes(usuario.papel)) {
      throw new ErroPermissao("Você não tem permissão para esta operação.");
    }
  }
}
