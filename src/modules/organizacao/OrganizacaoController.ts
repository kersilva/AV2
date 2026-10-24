import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import {
  ErroValidacao,
  OrganizacaoService,
  type NovaOrganizacao,
} from "@organizacao/OrganizacaoService.js";

export async function OrganizacaoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service = new OrganizacaoService(),
) {
  app.post<{ Body: NovaOrganizacao }>(
    "/organizacoes",
    {
      preHandler: escrever,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["id", "razaoSocial", "cnpj", "inscricaoEstadual", "enderecoCompleto", "telefone", "email"],
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
    async (req, res) => {
      try {
        return res.code(201).send(await service.cadastrar(req.body));
      } catch (erro) {
        if (erro instanceof ErroValidacao) return res.code(400).send({ erro: erro.message });
        throw erro;
      }
    },
  );

  app.get("/organizacoes", { preHandler: ler }, async (_req, res) =>
    res.send(await service.listar()),
  );
}
