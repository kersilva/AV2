import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { JournalService } from '@journal/JournalService.js';
import { erroSchema, respostasErroComuns } from '@infra/swaggerSchemas.js';

const respostasErroInterno = {
  500: {
    description: 'Erro interno do servidor',
    ...erroSchema,
  },
} as const;

const journalItemResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'dataHora', 'operacao', 'entidade', 'entidadeId', 'responsavel'],
  properties: {
    id: { type: 'string', description: 'Identificador único do registo no journal.' },
    dataHora: {
      type: 'string',
      format: 'date-time',
      description: 'Data e hora em que a operação ocorreu.',
    },
    operacao: {
      type: 'string',
      description: 'Tipo de operação realizada (ex: CREATE, UPDATE, DELETE).',
    },
    entidade: { type: 'string', description: 'Nome da entidade afetada.' },
    entidadeId: { type: 'string', description: 'Identificador da entidade afetada.' },
    dadosAnteriores: {
      type: 'object',
      nullable: true,
      description: 'Estado anterior dos dados (quando aplicável).',
    },
    dadosNovos: {
      type: 'object',
      nullable: true,
      description: 'Novo estado dos dados (quando aplicável).',
    },
    responsavel: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        usuario: { type: 'string' },
      },
      description: 'Utilizador responsável pela execução da operação.',
    },
  },
} as const;

type JournalQuery = {
  pagina?: string;
  porPagina?: string;
  operacao?: string;
  entidade?: string;
  usuarioId?: string;
  inicio?: string;
  fim?: string;
};

export async function JournalController(
  app: FastifyInstance,
  exigirAcessoAoJournal: preHandlerHookHandler,
  service: JournalService
) {
  app.get<{ Querystring: JournalQuery }>(
    '/journal',
    {
      preHandler: exigirAcessoAoJournal,
      schema: {
        tags: ['Auditoria'],
        summary: 'Lista os registos de auditoria (Journal)',
        description:
          'Retorna o histórico paginado de auditoria e logs de alterações do sistema com base nos filtros fornecidos[cite: 7].',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            pagina: {
              type: 'string',
              pattern: '^[1-9][0-9]*$',
              description: 'Número da página para paginação.',
            },
            porPagina: {
              type: 'string',
              pattern: '^[1-9][0-9]*$',
              description: 'Quantidade de registos por página.',
            },
            operacao: {
              type: 'string',
              minLength: 1,
              description: 'Filtrar por tipo de operação.',
            },
            entidade: {
              type: 'string',
              minLength: 1,
              description: 'Filtrar por nome da entidade.',
            },
            usuarioId: {
              type: 'string',
              minLength: 1,
              description: 'Filtrar por identificador do utilizador.',
            },
            inicio: {
              type: 'string',
              format: 'date',
              description: 'Data de início para filtro (YYYY-MM-DD).',
            },
            fim: {
              type: 'string',
              format: 'date',
              description: 'Data de fim para filtro (YYYY-MM-DD).',
            },
          },
        },
        response: {
          200: {
            description: 'Registos do journal encontrados com sucesso',
            type: 'object',
            properties: {
              itens: {
                type: 'array',
                items: journalItemResponseSchema,
              },
              total: { type: 'integer', description: 'Total de registos encontrados.' },
            },
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.listar({
          ...(req.query.pagina ? { pagina: Number(req.query.pagina) } : {}),
          ...(req.query.porPagina ? { porPagina: Number(req.query.porPagina) } : {}),
          ...(req.query.operacao ? { operacao: req.query.operacao } : {}),
          ...(req.query.entidade ? { entidade: req.query.entidade } : {}),
          ...(req.query.usuarioId ? { usuarioId: req.query.usuarioId } : {}),
          ...(req.query.inicio ? { inicio: new Date(`${req.query.inicio}T00:00:00.000Z`) } : {}),
          ...(req.query.fim ? { fim: new Date(`${req.query.fim}T23:59:59.999Z`) } : {}),
        })
      )
  );
}
