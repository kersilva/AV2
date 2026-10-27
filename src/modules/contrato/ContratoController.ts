import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { NovoContrato } from '@domain/entities/Contrato.js';
import type { ContratoService } from '@contrato/ContratoService.js';
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
      description: 'Identificador único do contrato.',
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
      description: 'Versão atual do contrato para controle otimista.',
    },
  },
} as const;

const contratoResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'organizacaoId',
    'dataAssinatura',
    'dataVencimento',
    'clausulas',
    'valorMensal',
    'renovacaoAutomatica',
    'versao',
  ],
  properties: {
    id: { type: 'string', description: 'Identificador único do contrato.' },
    organizacaoId: { type: 'string', description: 'Identificador da organização associada.' },
    dataAssinatura: {
      type: 'string',
      format: 'date-time',
      description: 'Data e hora de assinatura do contrato.',
    },
    dataVencimento: {
      type: 'string',
      format: 'date-time',
      description: 'Data e hora de vencimento do contrato.',
    },
    clausulas: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lista de cláusulas contratuais.',
    },
    valorMensal: { type: 'number', description: 'Valor mensal do contrato.' },
    renovacaoAutomatica: {
      type: 'boolean',
      description: 'Indica se o contrato possui renovação automática.',
    },
    versao: { type: 'integer', description: 'Versão atual do registro.' },
  },
} as const;

type ContratoBody = Omit<NovoContrato, 'dataAssinatura' | 'dataVencimento'> & {
  dataAssinatura: string;
  dataVencimento: string;
};

type RenovacaoBody = { novoVencimento: string; versao: number };

export async function ContratoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: ContratoService
) {
  app.get(
    '/contratos',
    {
      preHandler: ler,
      schema: {
        tags: ['Contratos'],
        summary: 'Lista os contratos',
        description: 'Retorna todos os contratos cadastrados no sistema.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Contratos encontrados com sucesso',
            type: 'array',
            items: contratoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (_req, res) => res.send(await service.listar())
  );

  app.get<{ Params: { id: string } }>(
    '/contratos/:id',
    {
      preHandler: ler,
      schema: {
        tags: ['Contratos'],
        summary: 'Busca um contrato por ID',
        description: 'Retorna os detalhes de um contrato específico através do seu identificador.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        response: {
          200: {
            description: 'Contrato encontrado com sucesso',
            ...contratoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => res.send(await service.buscar(req.params.id))
  );

  app.post<{ Body: ContratoBody }>(
    '/contratos',
    {
      preHandler: escrever,
      schema: {
        tags: ['Contratos'],
        summary: 'Cadastra um novo contrato',
        description: 'Cria um novo registro de contrato no sistema.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'organizacaoId',
            'dataAssinatura',
            'dataVencimento',
            'clausulas',
            'valorMensal',
            'renovacaoAutomatica',
          ],
          properties: {
            id: { type: 'string', minLength: 1, description: 'Identificador único do contrato.' },
            organizacaoId: {
              type: 'string',
              minLength: 1,
              description: 'Identificador da organização.',
            },
            dataAssinatura: {
              type: 'string',
              format: 'date-time',
              description: 'Data de assinatura.',
            },
            dataVencimento: {
              type: 'string',
              format: 'date-time',
              description: 'Data de vencimento.',
            },
            clausulas: {
              type: 'array',
              minItems: 1,
              items: { type: 'string', minLength: 1 },
              description: 'Lista contendo as cláusulas do contrato.',
            },
            valorMensal: {
              type: 'number',
              exclusiveMinimum: 0,
              description: 'Valor mensal estipulado.',
            },
            renovacaoAutomatica: {
              type: 'boolean',
              description: 'Define se renova automaticamente.',
            },
          },
        },
        response: {
          201: {
            description: 'Contrato cadastrado com sucesso',
            ...contratoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.code(201).send(
        await service.cadastrar(
          {
            ...req.body,
            dataAssinatura: new Date(req.body.dataAssinatura),
            dataVencimento: new Date(req.body.dataVencimento),
          },
          { id: req.user.sub, usuario: req.user.usuario }
        )
      )
  );

  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    '/contratos/:id',
    {
      preHandler: escrever,
      schema: {
        tags: ['Contratos'],
        summary: 'Exclui um contrato',
        description: 'Realiza a exclusão de um contrato com base no ID e versão atual.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Contrato excluído com sucesso',
            ...contratoResponseSchema,
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
    '/contratos/:id/reativar',
    {
      preHandler: escrever,
      schema: {
        tags: ['Contratos'],
        summary: 'Reativa um contrato',
        description: 'Reativa um contrato previamente desativado/excluído usando a versão atual.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Contrato reativado com sucesso',
            ...contratoResponseSchema,
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

  app.patch<{ Params: { id: string }; Body: RenovacaoBody }>(
    '/contratos/:id/renovacao',
    {
      preHandler: escrever,
      schema: {
        tags: ['Contratos'],
        summary: 'Renova um contrato',
        description: 'Atualiza a data de vencimento de um contrato mediante controle de versão.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['novoVencimento', 'versao'],
          properties: {
            novoVencimento: {
              type: 'string',
              format: 'date-time',
              description: 'Nova data de vencimento.',
            },
            versao: { type: 'integer', minimum: 1, description: 'Versão atual do contrato.' },
          },
        },
        response: {
          200: {
            description: 'Contrato renovado com sucesso',
            ...contratoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.renovar(req.params.id, req.body.versao, new Date(req.body.novoVencimento), {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );
}
