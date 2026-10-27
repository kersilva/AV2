import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { StatusRastreamento } from '@domain/enums/StatusRastreamento.js';
import type { PeriodoRelatorio } from '@relatorio/RelatorioTypes.js';
import type { RelatorioService } from '@relatorio/RelatorioService.js';
import { erroSchema, respostasErroComuns } from '@infra/swaggerSchemas.js';

const respostasErroInterno = {
  500: {
    description: 'Erro interno do servidor',
    ...erroSchema,
  },
} as const;

const statusRastreamentoEnum = {
  type: 'string',
  enum: Object.values(StatusRastreamento),
} as const;

const paramsOrganizacaoId = {
  type: 'object',
  additionalProperties: false,
  required: ['organizacaoId'],
  properties: {
    organizacaoId: {
      type: 'string',
      minLength: 1,
      description: 'Identificador único da organização.',
    },
  },
} as const;

const paramsStatus = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: {
      ...statusRastreamentoEnum,
      description: 'Status de rastreamento do relatório.',
    },
  },
} as const;

type PeriodoQuery = { inicio?: string; fim?: string };

function converter(q: PeriodoQuery): PeriodoRelatorio {
  const inicio = q.inicio ? new Date(`${q.inicio}T00:00:00.000Z`) : undefined;
  const fim = q.fim ? new Date(`${q.fim}T23:59:59.999Z`) : undefined;
  return { ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) };
}

const schemaPeriodo = {
  type: 'object',
  additionalProperties: false,
  properties: {
    inicio: {
      type: 'string',
      format: 'date',
      description: 'Data de início do período (YYYY-MM-DD).',
    },
    fim: { type: 'string', format: 'date', description: 'Data de fim do período (YYYY-MM-DD).' },
  },
} as const;

export async function RelatorioController(
  app: FastifyInstance,
  exigirAcessoRelatorio: preHandlerHookHandler,
  service: RelatorioService
) {
  app.get<{ Params: { organizacaoId: string }; Querystring: PeriodoQuery }>(
    '/relatorios/organizacoes/:organizacaoId',
    {
      preHandler: exigirAcessoRelatorio,
      schema: {
        tags: ['Relatórios'],
        summary: 'Gera relatório por organização',
        description:
          'Retorna o relatório consolidado para uma organização específica dentro de um período opcional[cite: 10].',
        security: [{ bearerAuth: [] }],
        params: paramsOrganizacaoId,
        querystring: schemaPeriodo,
        response: {
          200: {
            description: 'Dados consolidados do relatório por organização gerados com sucesso',
            type: 'object',
            additionalProperties: true,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.gerarRelatorioPorOrganizacao(req.params.organizacaoId, converter(req.query))
      )
  );

  app.get<{ Params: { status: StatusRastreamento } }>(
    '/relatorios/status/:status',
    {
      preHandler: exigirAcessoRelatorio,
      schema: {
        tags: ['Relatórios'],
        summary: 'Gera relatório por status de rastreamento',
        description:
          'Retorna o relatório consolidado de equipamentos filtrados por um determinado status de rastreamento[cite: 10].',
        security: [{ bearerAuth: [] }],
        params: paramsStatus,
        response: {
          200: {
            description: 'Dados consolidados do relatório por status gerados com sucesso',
            type: 'object',
            additionalProperties: true,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => res.send(await service.gerarRelatorioPorStatus(req.params.status))
  );

  app.get<{ Querystring: PeriodoQuery }>(
    '/relatorios/financeiro',
    {
      preHandler: exigirAcessoRelatorio,
      schema: {
        tags: ['Relatórios'],
        summary: 'Gera relatório financeiro',
        description:
          'Retorna o relatório financeiro consolidado do sistema com base no período opcional fornecido[cite: 10].',
        security: [{ bearerAuth: [] }],
        querystring: schemaPeriodo,
        response: {
          200: {
            description: 'Dados consolidados do relatório financeiro gerados com sucesso',
            type: 'object',
            additionalProperties: true,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => res.send(await service.gerarRelatorioFinanceiro(converter(req.query)))
  );
}
