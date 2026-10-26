import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type {
  NovoEquipamento,
  EquipamentoService,
} from "@equipamento/EquipamentoService.js";
import { EstadoFisico } from "@domain/enums/EstadoFisico.js";
import { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";

const schemaVersao = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["versao"],
    properties: { versao: { type: "integer", minimum: 1 } },
  },
} as const;

export async function EquipamentoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: EquipamentoService,
) {
  app.get("/equipamentos", { preHandler: ler }, async (_req, res) =>
    res.send(await service.listar()),
  );
  app.get<{ Params: { id: string } }>(
    "/equipamentos/:id",
    { preHandler: ler },
    async (req, res) =>
      res.send(await service.rastrearEquipamento(req.params.id)),
  );

  app.get<{ Params: { id: string } }>(
    "/equipamentos/:id/movimentacoes",
    { preHandler: ler },
    async (req, res) =>
      res.send(await service.listarMovimentacoes(req.params.id)),
  );

  app.post<{ Body: NovoEquipamento }>(
    "/equipamentos",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "codigoBarrasInterno",
            "tipo",
            "marca",
            "modelo",
            "anoFabricacao",
            "estadoFisico",
            "pesoQuilogramas",
            "loteId",
            "posicaoNoLote",
          ],
          properties: {
            id: { type: "string", minLength: 1 },
            codigoBarrasInterno: { type: "string", minLength: 1 },
            tipo: { type: "string" },
            marca: { type: "string", minLength: 1 },
            modelo: { type: "string", minLength: 1 },
            anoFabricacao: { type: "integer", minimum: 1900 },
            estadoFisico: { type: "string" },
            pesoQuilogramas: { type: "number", exclusiveMinimum: 0 },
            loteId: { type: "string", minLength: 1 },
            posicaoNoLote: { type: "integer", minimum: 1 },
            statusRastreamento: { type: "string" },
          },
        },
      },
    },
    async (req, res) =>
      res.code(201).send(
        await service.cadastrar(req.body, {
          id: req.user.sub,
          usuario: req.user.usuario,
        }),
      ),
  );
  app.patch<{
    Params: { id: string };
    Body: {
      estadoFisico: EstadoFisico;
      justificativa: string;
      versao: number;
    };
  }>(
    "/equipamentos/:id/estado",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["estadoFisico", "justificativa", "versao"],
          properties: {
            estadoFisico: {
              type: "string",
              enum: Object.values(EstadoFisico),
            },
            justificativa: { type: "string", minLength: 1 },
            versao: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.atualizarEstadoFisico(
          req.params.id,
          req.body.estadoFisico,
          req.body.justificativa,
          req.body.versao,
          { id: req.user.sub, usuario: req.user.usuario },
        ),
      ),
  );
  app.patch<{
    Params: { id: string };
    Body: {
      statusRastreamento: StatusRastreamento;
      justificativa: string;
      versao: number;
    };
  }>(
    "/equipamentos/:id/status",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["statusRastreamento", "justificativa", "versao"],
          properties: {
            statusRastreamento: {
              type: "string",
              enum: Object.values(StatusRastreamento),
            },
            justificativa: { type: "string", minLength: 1 },
            versao: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.atualizarStatus(
          req.params.id,
          req.body.statusRastreamento,
          req.body.justificativa,
          req.body.versao,
          { id: req.user.sub, usuario: req.user.usuario },
        ),
      ),
  );
  app.post<{
    Params: { id: string };
    Body: { destino: string; observacao?: string };
  }>(
    "/equipamentos/:id/movimentacoes",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["destino"],
          properties: {
            destino: { type: "string", minLength: 1 },
            observacao: { type: "string" },
          },
        },
      },
    },
    async (req, res) =>
      res.code(201).send(
        await service.registrarMovimentacao(req.params.id, req.body, {
          id: req.user.sub,
          usuario: req.user.usuario,
        }),
      ),
  );
  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    "/equipamentos/:id",
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
    "/equipamentos/:id/reativar",
    { preHandler: escrever, schema: schemaVersao },
    async (req, res) =>
      res.send(
        await service.reativar(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        }),
      ),
  );
}
