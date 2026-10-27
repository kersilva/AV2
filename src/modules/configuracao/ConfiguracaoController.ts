import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { ConfiguracaoService } from '@configuracao/ConfiguracaoService.js';
import { erroSchema, respostasErroComuns } from '@infra/swaggerSchemas.js';

const respostasErroInterno = {
  500: {
    description: 'Erro interno do servidor',
    ...erroSchema,
  },
} as const;

const configuracaoResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['aliquotaImposto', 'coeficienteDepreciacao', 'versao'],
  properties: {
    aliquotaImposto: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Alíquota de imposto aplicada.',
    },
    coeficienteDepreciacao: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Coeficiente de depreciação aplicado.',
    },
    versao: {
      type: 'integer',
      minimum: 1,
      description: 'Versão atual da configuração para controle otimista.',
    },
  },
} as const;

export async function ConfiguracaoController(
  app: FastifyInstance,
  exigirAdministrador: preHandlerHookHandler,
  service: ConfiguracaoService
) {
  app.get(
    '/configuracao',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Configuração'],
        summary: 'Obtém as configurações do sistema',
        description:
          'Retorna os parâmetros atuais de configuração do sistema. Somente administradores podem acessar esta rota.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Configurações encontradas com sucesso',
            ...configuracaoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (_req, res) => res.send(await service.obter())
  );

  app.put<{
    Body: {
      aliquotaImposto: number;
      coeficienteDepreciacao: number;
      versao?: number;
    };
  }>(
    '/configuracao',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Configuração'],
        summary: 'Atualiza as configurações do sistema',
        description:
          'Atualiza os parâmetros de alíquota de imposto e coeficiente de depreciação. Exige controle de versão otimista.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['aliquotaImposto', 'coeficienteDepreciacao'],
          properties: {
            aliquotaImposto: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Nova alíquota de imposto (entre 0 e 1).',
            },
            coeficienteDepreciacao: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Novo coeficiente de depreciação (entre 0 e 1).',
            },
            versao: {
              type: 'integer',
              minimum: 1,
              description: 'Versão atual da configuração para controle otimista.',
            },
          },
        },
        response: {
          200: {
            description: 'Configuração atualizada com sucesso',
            ...configuracaoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(await service.atualizar(req.body, { id: req.user.sub, usuario: req.user.usuario }))
  );
}
