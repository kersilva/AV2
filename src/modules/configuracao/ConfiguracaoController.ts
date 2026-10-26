import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { ConfiguracaoService } from "@configuracao/ConfiguracaoService.js";
export async function ConfiguracaoController(
  app: FastifyInstance,
  exigirAdministrador: preHandlerHookHandler,
  service: ConfiguracaoService,
) {
  app.get(
    "/configuracao",
    { preHandler: exigirAdministrador },
    async (_req, res) => res.send(await service.obter()),
  );
  app.put<{
    Body: {
      aliquotaImposto: number;
      coeficienteDepreciacao: number;
      versao?: number;
    };
  }>(
    "/configuracao",
    {
      preHandler: exigirAdministrador,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["aliquotaImposto", "coeficienteDepreciacao"],
          properties: {
            aliquotaImposto: { type: "number", minimum: 0, maximum: 1 },
            coeficienteDepreciacao: { type: "number", minimum: 0, maximum: 1 },
            versao: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req, res) => res.send(await service.atualizar(req.body, { id: req.user.sub, usuario: req.user.usuario })),
  );
}

