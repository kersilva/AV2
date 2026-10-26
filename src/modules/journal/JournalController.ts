import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { JournalService } from "@journal/JournalService.js";

type JournalQuery = {
  pagina?: string;
  porPagina?: string;
  operacao?: string;
  entidade?: string;
  usuarioId?: string;
  inicio?: string;
  fim?: string;
};

export async function JournalController(
  app: FastifyInstance,
  exigirAcessoAoJournal: preHandlerHookHandler,
  service: JournalService,
) {
  app.get<{ Querystring: JournalQuery }>(
    "/journal",
    {
      preHandler: exigirAcessoAoJournal,
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            pagina: { type: "string", pattern: "^[1-9][0-9]*$" },
            porPagina: { type: "string", pattern: "^[1-9][0-9]*$" },
            operacao: { type: "string", minLength: 1 },
            entidade: { type: "string", minLength: 1 },
            usuarioId: { type: "string", minLength: 1 },
            inicio: { type: "string", format: "date" },
            fim: { type: "string", format: "date" },
          },
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.listar({
          ...(req.query.pagina ? { pagina: Number(req.query.pagina) } : {}),
          ...(req.query.porPagina
            ? { porPagina: Number(req.query.porPagina) }
            : {}),
          ...(req.query.operacao ? { operacao: req.query.operacao } : {}),
          ...(req.query.entidade ? { entidade: req.query.entidade } : {}),
          ...(req.query.usuarioId ? { usuarioId: req.query.usuarioId } : {}),
          ...(req.query.inicio
            ? { inicio: new Date(`${req.query.inicio}T00:00:00.000Z`) }
            : {}),
          ...(req.query.fim
            ? { fim: new Date(`${req.query.fim}T23:59:59.999Z`) }
            : {}),
        }),
      ),
  );
}
