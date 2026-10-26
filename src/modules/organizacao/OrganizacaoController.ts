import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { NovaOrganizacao } from "@domain/repositories/OrganizacaoRepository.js";
import type { OrganizacaoService } from "@organizacao/OrganizacaoService.js";

const schemaVersao = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["versao"],
    properties: { versao: { type: "integer", minimum: 1 } },
  },
} as const;

export async function OrganizacaoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: OrganizacaoService,
) {
  app.post<{ Body: NovaOrganizacao }>(
    "/organizacoes",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "razaoSocial",
            "cnpj",
            "inscricaoEstadual",
            "enderecoCompleto",
            "telefone",
            "email",
          ],
          properties: {
            id: { type: "string", minLength: 1 },
            razaoSocial: { type: "string", minLength: 1 },
            cnpj: { type: "string", minLength: 1 },
            inscricaoEstadual: { type: "string", minLength: 1 },
            enderecoCompleto: { type: "string", minLength: 1 },
            telefone: { type: "string", minLength: 1 },
            email: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, res) =>
      res
        .code(201)
        .send(
          await service.cadastrar(req.body, {
            id: req.user.sub,
            usuario: req.user.usuario,
          }),
        ),
  );

  app.get("/organizacoes", { preHandler: ler }, async (_req, res) =>
    res.send(await service.listar()),
  );

  app.get<{ Params: { id: string } }>(
    "/organizacoes/:id",
    { preHandler: ler },
    async (req, res) =>
      res.send(await service.rastrearOrganizacao(req.params.id)),
  );

  app.patch<{
    Params: { id: string };
    Body: Partial<Omit<NovaOrganizacao, "id">> & { versao: number };
  }>(
    "/organizacoes/:id",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["versao"],
          properties: {
            versao: { type: "integer", minimum: 1 },
            razaoSocial: { type: "string", minLength: 1 },
            cnpj: { type: "string", minLength: 1 },
            inscricaoEstadual: { type: "string", minLength: 1 },
            enderecoCompleto: { type: "string", minLength: 1 },
            telefone: { type: "string", minLength: 1 },
            email: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, res) => {
      const { versao, ...dados } = req.body;
      return res.send(
        await service.atualizar(req.params.id, versao, dados, {
          id: req.user.sub,
          usuario: req.user.usuario,
        }),
      );
    },
  );

  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    "/organizacoes/:id",
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
    "/organizacoes/:id/reativar",
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
