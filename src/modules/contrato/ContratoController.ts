import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { NovoContrato } from "@domain/entities/Contrato.js";
import type { ContratoService } from "@contrato/ContratoService.js";

const schemaVersao = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["versao"],
    properties: { versao: { type: "integer", minimum: 1 } },
  },
} as const;
type ContratoBody = Omit<NovoContrato, "dataAssinatura" | "dataVencimento"> & {
  dataAssinatura: string;
  dataVencimento: string;
};

type RenovacaoBody = { novoVencimento: string; versao: number };

export async function ContratoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: ContratoService,
) {
  app.get("/contratos", { preHandler: ler }, async (_req, res) =>
    res.send(await service.listar()),
  );
  app.get<{ Params: { id: string } }>(
    "/contratos/:id",
    { preHandler: ler },
    async (req, res) => res.send(await service.buscar(req.params.id)),
  );
  app.post<{ Body: ContratoBody }>(
    "/contratos",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "organizacaoId",
            "dataAssinatura",
            "dataVencimento",
            "clausulas",
            "valorMensal",
            "renovacaoAutomatica",
          ],
          properties: {
            id: { type: "string", minLength: 1 },
            organizacaoId: { type: "string", minLength: 1 },
            dataAssinatura: { type: "string", format: "date-time" },
            dataVencimento: { type: "string", format: "date-time" },
            clausulas: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
            },
            valorMensal: { type: "number", exclusiveMinimum: 0 },
            renovacaoAutomatica: { type: "boolean" },
          },
        },
      },
    },
    async (req, res) =>
      res.code(201).send(
        await service.cadastrar(
          {
            ...req.body,
            dataAssinatura: new Date(req.body.dataAssinatura),
            dataVencimento: new Date(req.body.dataVencimento),
          },
          { id: req.user.sub, usuario: req.user.usuario },
        ),
      ),
  );
  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    "/contratos/:id",
    { preHandler: escrever, schema: schemaVersao },
    async (req, res) =>
      res.send(
        await service.excluir(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        }),
      ),
  );
  app.patch<{ Params: { id: string }; Body: { versao: number } }>(
    "/contratos/:id/reativar",
    { preHandler: escrever, schema: schemaVersao },
    async (req, res) =>
      res.send(
        await service.reativar(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        }),
      ),
  );

  app.patch<{ Params: { id: string }; Body: RenovacaoBody }>(
    "/contratos/:id/renovacao",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["novoVencimento", "versao"],
          properties: {
            novoVencimento: { type: "string", format: "date-time" },
            versao: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.renovar(
          req.params.id,
          req.body.versao,
          new Date(req.body.novoVencimento),
          { id: req.user.sub, usuario: req.user.usuario },
        ),
      ),
  );
}
