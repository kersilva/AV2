import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { NovoLote, LoteService } from "@lote/LoteService.js";

const schemaVersao = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["versao"],
    properties: { versao: { type: "integer", minimum: 1 } },
  },
} as const;

export async function LoteController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: LoteService,
) {
  app.get("/lotes", { preHandler: ler }, async (_req, res) => res.send(await service.listar()));
  app.get<{ Params: { id: string } }>("/lotes/:id", { preHandler: ler }, async (req, res) => res.send(await service.buscar(req.params.id)));
  app.post<{ Body: Omit<NovoLote, "dataEntrada"> & { dataEntrada: string } }>("/lotes", {
    preHandler: escrever,
    schema: { body: { type: "object", additionalProperties: false, required: ["id", "dataEntrada", "organizacaoId", "notaFiscal", "transportadora"], properties: { id: { type: "string", minLength: 1 }, dataEntrada: { type: "string", format: "date-time" }, organizacaoId: { type: "string", minLength: 1 }, notaFiscal: { type: "string", minLength: 1 }, transportadora: { type: "string", minLength: 1 }, observacoes: { type: ["string", "null"] } } } },
  }, async (req, res) => res.code(201).send(await service.criarLote({ ...req.body, dataEntrada: new Date(req.body.dataEntrada) }, { id: req.user.sub, usuario: req.user.usuario })));
  app.patch<{ Params: { id: string }; Body: { versao: number } }>("/lotes/:id/processar", { preHandler: escrever, schema: schemaVersao }, async (req, res) => res.send(await service.processarTriagem(req.params.id, req.body.versao, { id: req.user.sub, usuario: req.user.usuario })));
  app.delete<{ Params: { id: string }; Body: { versao: number } }>("/lotes/:id", { preHandler: escrever, schema: schemaVersao }, async (req, res) => res.send(await service.excluir(req.params.id, req.body.versao, { id: req.user.sub, usuario: req.user.usuario })));
  app.patch<{ Params: { id: string }; Body: { versao: number } }>("/lotes/:id/reativar", { preHandler: escrever, schema: schemaVersao }, async (req, res) => res.send(await service.reativar(req.params.id, req.body.versao, { id: req.user.sub, usuario: req.user.usuario })));
}
