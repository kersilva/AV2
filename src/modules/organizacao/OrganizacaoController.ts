import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { NovaOrganizacao } from '@domain/repositories/OrganizacaoRepository.js';
import type { OrganizacaoService } from '@organizacao/OrganizacaoService.js';
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
      description: 'Identificador único da organização.',
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
      description: 'Versão atual da organização para controle otimista.',
    },
  },
} as const;

const organizacaoResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'razaoSocial',
    'cnpj',
    'inscricaoEstadual',
    'enderecoCompleto',
    'telefone',
    'email',
    'versao',
  ],
  properties: {
    id: { type: 'string', description: 'Identificador único da organização.' },
    razaoSocial: { type: 'string', description: 'Razão social da organização.' },
    cnpj: { type: 'string', description: 'Número do CNPJ.' },
    inscricaoEstadual: { type: 'string', description: 'Inscrição estadual.' },
    enderecoCompleto: { type: 'string', description: 'Endereço completo.' },
    telefone: { type: 'string', description: 'Número de telefone para contato.' },
    email: { type: 'string', description: 'Endereço de correio eletrónico.' },
    versao: { type: 'integer', description: 'Versão atual do registo.' },
  },
} as const;

export async function OrganizacaoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service: OrganizacaoService
) {
  app.post<{ Body: NovaOrganizacao }>(
    '/organizacoes',
    {
      preHandler: escrever,
      schema: {
        tags: ['Organizações'],
        summary: 'Cadastra uma nova organização',
        description: 'Regista uma nova organização no sistema[cite: 9].',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'razaoSocial',
            'cnpj',
            'inscricaoEstadual',
            'enderecoCompleto',
            'telefone',
            'email',
          ],
          properties: {
            id: {
              type: 'string',
              minLength: 1,
              description: 'Identificador único da organização.',
            },
            razaoSocial: { type: 'string', minLength: 1, description: 'Razão social.' },
            cnpj: { type: 'string', minLength: 1, description: 'CNPJ da organização.' },
            inscricaoEstadual: { type: 'string', minLength: 1, description: 'Inscrição estadual.' },
            enderecoCompleto: { type: 'string', minLength: 1, description: 'Endereço completo.' },
            telefone: { type: 'string', minLength: 1, description: 'Telefone de contacto.' },
            email: { type: 'string', minLength: 1, description: 'Correio eletrónico.' },
          },
        },
        response: {
          201: {
            description: 'Organização cadastrada com sucesso',
            ...organizacaoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.code(201).send(
        await service.cadastrar(req.body, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );

  app.get(
    '/organizacoes',
    {
      preHandler: ler,
      schema: {
        tags: ['Organizações'],
        summary: 'Lista as organizações',
        description: 'Retorna todas as organizações registadas no sistema[cite: 9].',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Organizações encontradas com sucesso',
            type: 'array',
            items: organizacaoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (_req, res) => res.send(await service.listar())
  );

  app.get<{ Params: { id: string } }>(
    '/organizacoes/:id',
    {
      preHandler: ler,
      schema: {
        tags: ['Organizações'],
        summary: 'Rastreia uma organização por ID',
        description:
          'Retorna os detalhes de uma organização específica através do seu identificador[cite: 9].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        response: {
          200: {
            description: 'Organização encontrada com sucesso',
            ...organizacaoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => res.send(await service.rastrearOrganizacao(req.params.id))
  );

  app.patch<{
    Params: { id: string };
    Body: Partial<Omit<NovaOrganizacao, 'id'>> & { versao: number };
  }>(
    '/organizacoes/:id',
    {
      preHandler: escrever,
      schema: {
        tags: ['Organizações'],
        summary: 'Atualiza uma organização',
        description:
          'Atualiza os dados de uma organização existente exigindo a versão atual para controlo otimista[cite: 9].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['versao'],
          properties: {
            versao: { type: 'integer', minimum: 1, description: 'Versão atual da organização.' },
            razaoSocial: { type: 'string', minLength: 1, description: 'Nova razão social.' },
            cnpj: { type: 'string', minLength: 1, description: 'Novo CNPJ.' },
            inscricaoEstadual: {
              type: 'string',
              minLength: 1,
              description: 'Nova inscrição estadual.',
            },
            enderecoCompleto: {
              type: 'string',
              minLength: 1,
              description: 'Novo endereço completo.',
            },
            telefone: { type: 'string', minLength: 1, description: 'Novo telefone.' },
            email: { type: 'string', minLength: 1, description: 'Novo correio eletrónico.' },
          },
        },
        response: {
          200: {
            description: 'Organização atualizada com sucesso',
            ...organizacaoResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => {
      const { versao, ...dados } = req.body;
      return res.send(
        await service.atualizar(req.params.id, versao, dados, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      );
    }
  );

  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    '/organizacoes/:id',
    {
      preHandler: escrever,
      schema: {
        tags: ['Organizações'],
        summary: 'Exclui uma organização',
        description: 'Remove uma organização com base no ID e na versão atual[cite: 9].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Organização excluída com sucesso',
            ...organizacaoResponseSchema,
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
    '/organizacoes/:id/reativar',
    {
      preHandler: escrever,
      schema: {
        tags: ['Organizações'],
        summary: 'Reativa uma organização',
        description:
          'Reativa uma organização previamente inativada/excluída usando a versão atual[cite: 9].',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: {
            description: 'Organização reativada com sucesso',
            ...organizacaoResponseSchema,
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
