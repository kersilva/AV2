import type { FastifyInstance } from "fastify";
import { DomainError } from "@/shared/errors/DomainError.js";
export function registrarErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof DomainError)
      return reply
        .code(erro.statusHttp)
        .send({ codigo: erro.codigo, erro: erro.message });
    const code = (erro as { code?: string }).code;
    if (code === "P2002")
      return reply
        .code(409)
        .send({
          codigo: "CONFLITO",
          erro: "Já existe um registro com esses dados.",
        });
    if (code === "P2034")
      return reply
        .code(409)
        .send({
          codigo: "CONFLITO",
          erro: "Conflito ao salvar. Tente novamente.",
        });
    if (code === "P2025")
      return reply
        .code(404)
        .send({ codigo: "NAO_ENCONTRADO", erro: "Registro não encontrado." });
    if ((erro as { validation?: unknown }).validation)
      return reply
        .code(400)
        .send({
          codigo: "DADOS_INVALIDOS",
          erro: "A requisição contém dados inválidos.",
        });
    req.log.error(erro);
    return reply
      .code(500)
      .send({ codigo: "ERRO_INTERNO", erro: "Ocorreu um erro interno." });
  });
}
