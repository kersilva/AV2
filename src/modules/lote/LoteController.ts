import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { NovoLote, LoteService } from '@lote/LoteService.js';
import { erroSchema, respostasErroComuns } from '@infra/swaggerSchemas.js';

const respostasErroInterno = {
  500: {
    description: 'Erro interno do servidor',
    ...erroSchema,
  },
} as const;

const paramsId = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      description: 'Identificador único do lote.',
    },
  },
} as const;

const schemaVersao = {
  type: 'object',
  additionalProperties: false,
  required: ['versao'],
  properties: {
    versao: {
      type: 'integer',
      minimum: 1,
      description: 'Versão atual do lote para controle otimista.',
    },
  },
} as const;

const loteResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'dataEntrada', 'organizacaoId', 'notaFiscal', 'transportadora', 'versao'],
  properties: {
    id: { type: 'string', description: 'Identificador único do lote.' },
    dataEntrada: {
      type: 'string',
      format: 'date-time',
      description: 'Data e hora de entrada do lote.',
    },
    organizacaoId: { type: 'string', description: 'Identificador da organização associada.' },
    notaFiscal: { type: 'string', description: 'Número da nota fiscal.' },
    transportadora: { type: 'string', description: 'Nome da transportadora.' },
    observacoes: { type: ['string', 'null'], description: 'Observações adicionais.' },
    versao: { type: 'integer', description: 'Versão atual do registro.' },
  },
} as const;

export async function LoteController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: LoteService
) {
  app.get(
    '/lotes',
    {
      preHandler: ler,
      schema: {
        tags: ['Lotes'],
        summary: 'Lista os lotes',
        description: 'Retorna todos os lotes registados no sistema[cite: 8].',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Lotes encontrados com sucesso',
            type: 'array',
            items: loteResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (_req, res) => res.send(await service.listar())
  );

  app.get<{ Params: { id: string } }>(
    '/lotes/:id',
    {
      preHandler: ler,
      schema: {
        tags: ['Lotes'],
        summary: 'Busca um lote por ID',
        description:
          'Retorna os detalhes de um lote específico através do seu identificador[cite: 8].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        response: {
          200: {
            description: 'Lote encontrado com sucesso',
            ...loteResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => res.send(await service.buscar(req.params.id))
  );

  app.post<{ Body: Omit<NovoLote, 'dataEntrada'> & { dataEntrada: string } }>(
    '/lotes',
    {
      preHandler: escrever,
      schema: {
        tags: ['Lotes'],
        summary: 'Cria um novo lote',
        description: 'Regista a entrada de um novo lote no sistema[cite: 8].',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'dataEntrada', 'organizacaoId', 'notaFiscal', 'transportadora'],
          properties: {
            id: { type: 'string', minLength: 1, description: 'Identificador único do lote.' },
            dataEntrada: {
              type: 'string',
              format: 'date-time',
              description: 'Data e hora de entrada.',
            },
            organizacaoId: {
              type: 'string',
              minLength: 1,
              description: 'Identificador da organização.',
            },
            notaFiscal: { type: 'string', minLength: 1, description: 'Número da nota fiscal.' },
            transportadora: {
              type: 'string',
              minLength: 1,
              description: 'Nome da transportadora.',
            },
            observacoes: { type: ['string', 'null'], description: 'Observações opcionais.' },
          },
        },
        response: {
          201: {
            description: 'Lote criado com sucesso',
            ...loteResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res
        .code(201)
        .send(
          await service.criarLote(
            { ...req.body, dataEntrada: new Date(req.body.dataEntrada) },
            { id: req.user.sub, usuario: req.user.usuario }
          )
        )
  );

  app.patch<{ Params: { id: string }; Body: { versao: number } }>(
    '/lotes/:id/processar',
    {
      preHandler: escrever,
      schema: {
        tags: ['Lotes'],
        summary: 'Processa a triagem de um lote',
        description:
          'Inicia ou conclui o processo de triagem do lote utilizando a versão atual[cite: 8].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Lote processado com sucesso',
            ...loteResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.processarTriagem(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );

  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    '/lotes/:id',
    {
      preHandler: escrever,
      schema: {
        tags: ['Lotes'],
        summary: 'Exclui um lote',
        description: 'Remove um lote com base no ID e na versão atual[cite: 8].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Lote excluído com sucesso',
            ...loteResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.excluir(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );

  app.patch<{ Params: { id: string }; Body: { versao: number } }>(
    '/lotes/:id/reativar',
    {
      preHandler: escrever,
      schema: {
        tags: ['Lotes'],
        summary: 'Reativa um lote',
        description:
          'Reativa um lote previamente inativado/excluído usando a versão atual[cite: 8].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Lote reativado com sucesso',
            ...loteResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.reativar(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );
}
