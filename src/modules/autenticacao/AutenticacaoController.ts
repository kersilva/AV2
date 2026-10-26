import type { FastifyInstance } from "fastify";
import type { AutenticacaoService } from "@autenticacao/AutenticacaoService.js";
import { timingSafeEqual } from "node:crypto";
import {
  ErroAutenticacao,
  ErroPermissao,
} from "@/shared/errors/DomainError.js";
function confereToken(recebido: string, esperado: string) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function AutenticacaoController(
  app: FastifyInstance,
  service: AutenticacaoService,
) {
  app.post<{
    Body: {
      id: string;
      usuario: string;
      senha: string;
      tokenBootstrap: string;
    };
  }>(
    "/auth/primeiro-administrador",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["id", "usuario", "senha", "tokenBootstrap"],
          properties: {
            id: { type: "string", minLength: 1 },
            usuario: { type: "string", minLength: 1 },
            senha: { type: "string" },
            tokenBootstrap: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, res) => {
      const esperado = process.env.ADMIN_BOOTSTRAP_TOKEN;
      if (!esperado || !confereToken(req.body.tokenBootstrap, esperado))
        throw new ErroPermissao("Token de configuração inicial inválido.");
      const usuario = await service.criarPrimeiroAdmin(req.body);
      return res
        .code(201)
        .send({
          id: usuario.id,
          usuario: usuario.usuario,
          papel: usuario.papel,
        });
    },
  );
  app.post<{ Body: { usuario: string; senha: string } }>(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["usuario", "senha"],
          properties: {
            usuario: { type: "string", minLength: 1 },
            senha: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, res) => {
      const usuario = await service.autenticar(
        req.body.usuario,
        req.body.senha,
      );
      if (!usuario) throw new ErroAutenticacao("Usuário ou senha inválidos.");
      const token = await res.jwtSign(
        { sub: usuario.id, usuario: usuario.usuario, papel: usuario.papel },
        { expiresIn: "30m" },
      );
      return res.send({ token, tipo: "Bearer", expiraEmSegundos: 1800 });
    },
  );
}
