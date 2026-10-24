import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { JournalService } from "../services/JournalService.js";

export async function JournalController(
  app: FastifyInstance,
  exigirAcessoAuditoria: preHandlerHookHandler,
  service = new JournalService(),
) {
  app.get(
    "/journal",
    { preHandler: exigirAcessoAuditoria },
    async (_req, res) => {
      const transacoes = await service.listar();
      return res.send(transacoes);
    },
  );
}
