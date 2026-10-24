import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { PapelUsuario } from "../generated/prisma/enums.js";
import { prisma } from "./database.js";

export function exigirPapeis(...papeis: PapelUsuario[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ erro: "Autenticação necessária." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: request.user.sub },
      select: { ativo: true, papel: true },
    });
    if (!usuario?.ativo) {
      return reply.code(401).send({ erro: "Usuário inativo ou inexistente." });
    }
    if (!papeis.includes(usuario.papel)) {
      return reply.code(403).send({ erro: "Você não tem permissão para esta operação." });
    }
  };
}
