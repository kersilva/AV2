import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { ServicoLote, type NovoLote } from "@lote/LoteService.js";

export async function LoteController(
  app: FastifyInstance, ler: preHandlerHookHandler, escrever: preHandlerHookHandler,
  service = new ServicoLote(),
) {
  app.get("/lotes", { preHandler: ler }, async (_req, res) => res.send(await service.listar()));
  app.get<{ Params: { id: string } }>("/lotes/:id", { preHandler: ler },
    async (req, res) => res.send(await service.buscar(req.params.id)));
  app.post<{ Body: NovoLote }>("/lotes", { preHandler: escrever },
    async (req, res) => res.code(201).send(await service.criarLote({
      ...req.body, dataEntrada: new Date(req.body.dataEntrada as unknown as string),
    })));
  app.patch<{ Params: { id: string }; Body: { versao: number } }>(
    "/lotes/:id/processar",
    { preHandler: escrever, schema: { body: { type: "object", required: ["versao"], properties: { versao: { type: "integer", minimum: 1 } }, additionalProperties: false } } },
    async (req, res) => res.send(await service.processarTriagem(req.params.id, req.body.versao)),
  );
}
