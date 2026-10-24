import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { PapelUsuario } from "@/generated/prisma/enums.js";
import { prisma } from "./database.js";

export function exigirPapeis(...papeis: PapelUsuario[]): preHandlerHookHandler {
  return async (req: FastifyRequest, res: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return res.code(401).send({ erro: "Autenticação necessária." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: { ativo: true, papel: true },
    });
    if (!usuario?.ativo) {
      return res.code(401).send({ erro: "Usuário inativo ou inexistente." });
    }
    if (!papeis.includes(usuario.papel)) {
      return res.code(403).send({ erro: "Você não tem permissão para esta operação." });
    }
  };
}
