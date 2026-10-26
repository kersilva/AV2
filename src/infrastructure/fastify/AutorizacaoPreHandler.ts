import type { preHandlerHookHandler } from "fastify";
import type { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import type { AutorizacaoService } from "@autenticacao/AutorizacaoService.js";
import { ErroAutenticacao } from "@/shared/errors/DomainError.js";

export function criarGuardAutorizacao(
  autorizacao: AutorizacaoService,
): (...papeis: PapelUsuario[]) => preHandlerHookHandler {
  return (...papeis) => async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new ErroAutenticacao("Autenticação necessária.");
    }

    await autorizacao.verificarAcesso(request.user.sub, papeis);
  };
}
