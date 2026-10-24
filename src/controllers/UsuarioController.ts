import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { PapelUsuario } from "../generated/prisma/enums.js";
import { UsuarioService } from "../services/UsuarioService.js";

export async function UsuarioController(
  app: FastifyInstance,
  exigirAdministrador: preHandlerHookHandler,
  service = new UsuarioService(),
) {
  app.get("/usuarios", { preHandler: exigirAdministrador }, async (_req, res) =>
    res.send(await service.listar()),
  );

  app.post<{
    Body: { id: string; usuario: string; senha: string; papel: PapelUsuario };
  }>(
    "/usuarios",
    {
      preHandler: exigirAdministrador,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["id", "usuario", "senha", "papel"],
          properties: {
            id: { type: "string", minLength: 1 },
            usuario: { type: "string", minLength: 1 },
            senha: { type: "string", minLength: 8 },
            papel: { type: "string", enum: ["ADMINISTRADOR", "OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"] },
          },
        },
      },
    },
    async (req, res) => res.code(201).send(await service.cadastrar(req.body)),
  );

  app.patch<{
    Params: { id: string };
    Body: { ativo: boolean; versao: number };
  }>(
    "/usuarios/:id/ativo",
    {
      preHandler: exigirAdministrador,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["ativo", "versao"],
          properties: { ativo: { type: "boolean" }, versao: { type: "integer", minimum: 1 } },
        },
      },
    },
    async (req, res) => res.send(await service.alterarAtivo(req.params.id, req.body.ativo, req.body.versao)),
  );

  app.patch<{
    Params: { id: string };
    Body: { papel: PapelUsuario; versao: number };
  }>(
    "/usuarios/:id/papel",
    {
      preHandler: exigirAdministrador,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["papel", "versao"],
          properties: {
            papel: { type: "string", enum: ["ADMINISTRADOR", "OPERADOR_CADASTRO", "GESTOR_ALMOXARIFADO", "AUDITOR"] },
            versao: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req, res) => res.send(await service.alterarPapel(req.params.id, req.body.papel, req.body.versao)),
  );
  app.delete<{
    Params: { id: string };
    Body: { versao: number };
  }>(
    "/usuarios/:id",
    {
      preHandler: exigirAdministrador,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["versao"],
          properties: { versao: { type: "integer", minimum: 1 } },
        },
      },
    },
    async (req, res) => res.send(await service.deletar(req.params.id, req.body.versao)),
  );
}

