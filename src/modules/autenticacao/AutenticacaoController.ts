import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ServicoAutenticacao } from "@autenticacao/AutenticacaoService.js";

function confereToken(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function AutenticacaoController(
  app: FastifyInstance,
  service = new ServicoAutenticacao(),
) {
  app.post<{
    Body: { id: string; usuario: string; senha: string; tokenBootstrap: string };
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
            senha: { type: "string", minLength: 8 },
            tokenBootstrap: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, res) => {
      const esperado = process.env.ADMIN_BOOTSTRAP_TOKEN;
      if (!esperado || !confereToken(req.body.tokenBootstrap, esperado)) {
        return res.code(403).send({ erro: "Token de configuração inicial inválido." });
      }

      try {
        const usuario = await service.criarPrimeiroAdmin(req.body);
        return res.code(201).send({ id: usuario.id, usuario: usuario.usuario, papel: usuario.papel });
      } catch (erro) {
        if (erro instanceof Error && erro.message === "A configuração inicial já foi concluída.") {
          return res.code(409).send({ erro: erro.message });
        }
        throw erro;
      }
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
      const usuario = await service.autenticar(req.body.usuario, req.body.senha);
      if (!usuario) return res.code(401).send({ erro: "Usuário ou senha inválidos." });
      const token = await res.jwtSign(
        { sub: usuario.id, usuario: usuario.usuario, papel: usuario.papel },
        { expiresIn: "30m" },
      );
      return res.send({ token, tipo: "Bearer", expiraEmSegundos: 1800 });
    },
  );
}
