import type { FastifyInstance } from 'fastify';
import { DomainError } from '@/shared/errors/DomainError.js';
export function registrarErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof DomainError)
      return reply.code(erro.statusHttp).send({ codigo: erro.codigo, erro: erro.message });
    const code = (erro as { code?: string }).code;
    if (code === 'P2002')
      return reply.code(409).send({
        codigo: 'CONFLITO',
        erro: 'Já existe um registro com esses dados.',
      });
    if (code === 'P2034')
      return reply.code(409).send({
        codigo: 'CONFLITO',
        erro: 'Conflito ao salvar. Tente novamente.',
      });
    if (code === 'P2025')
      return reply.code(404).send({ codigo: 'NAO_ENCONTRADO', erro: 'Registro não encontrado.' });
    if (code === 'P2039') {
      const causa = (
        erro as {
          meta?: {
            driverAdapterError?: {
              cause?: { originalCode?: string; originalMessage?: string };
            };
          };
        }
      ).meta?.driverAdapterError?.cause;

      if (causa?.originalCode === 'P0001')
        return reply.code(422).send({ codigo: 'REGRA_DE_NEGOCIO', erro: causa.originalMessage });

      if (causa?.originalCode === '23514')
        return reply.code(400).send({
          codigo: 'DADOS_INVALIDOS',
          erro: 'Os dados violam uma regra de validação do banco.',
        });

      if (causa?.originalCode === '23503')
        return reply.code(409).send({
          codigo: 'CONFLITO',
          erro: 'O registro está vinculado a outro registro.',
        });
    }
    if ((erro as { validation?: unknown }).validation)
      return reply.code(400).send({
        codigo: 'DADOS_INVALIDOS',
        erro: 'A requisição contém dados inválidos.',
      });
    req.log.error(erro);
    return reply.code(500).send({ codigo: 'ERRO_INTERNO', erro: 'Ocorreu um erro interno.' });
  });
}
