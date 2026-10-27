import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { PapelUsuario } from '@domain/enums/PapelUsuario.js';
import type { UsuarioService } from '@usuario/UsuarioService.js';
import {
  erroSchema,
  papelEnum,
  respostasErroAuth,
  respostasErroComuns,
  usuarioResumidoSchema,
} from '@infra/swaggerSchemas.js';

const usuarioResponseSchema = {
  ...usuarioResumidoSchema,
  additionalProperties: false,
  required: ['id', 'usuario', 'papel', 'ativo', 'ultimoAcesso', 'versao'],
  properties: {
    ...usuarioResumidoSchema.properties,
    ultimoAcesso: {
      type: ['string', 'null'],
      format: 'date-time',
      description: 'Data e hora do último login. Pode ser nulo antes do primeiro login.',
    },
  },
} as const;

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
    id: { type: 'string', minLength: 1, description: 'Identificador único do usuário.' },
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
      description: 'Versão atual do recurso para controle otimista.',
    },
  },
} as const;

export async function UsuarioController(
  app: FastifyInstance,
  exigirAdministrador: preHandlerHookHandler,
  service: UsuarioService
) {
  app.get(
    '/usuarios',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Usuários'],
        summary: 'Lista os usuários',
        description:
          'Retorna os dados públicos dos usuários. Somente administradores podem acessar esta rota.',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Usuários encontrados',
            type: 'array',
            items: usuarioResponseSchema,
          },
          ...respostasErroAuth,
          ...respostasErroInterno,
        },
      },
    },
    async (_req, res) => res.send(await service.listar())
  );

  app.post<{
    Body: { id: string; usuario: string; senha: string; papel: PapelUsuario };
  }>(
    '/usuarios',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Usuários'],
        summary: 'Cadastra um usuário',
        description:
          'Cria uma credencial. A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes em UTF-8.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'usuario', 'senha', 'papel'],
          properties: {
            id: {
              type: 'string',
              minLength: 1,
              description: 'Identificador único do usuário.',
            },
            usuario: {
              type: 'string',
              minLength: 1,
              description: 'Nome usado no login.',
            },
            senha: {
              type: 'string',
              minLength: 8,
              description: 'Senha com pelo menos 8 caracteres e até 72 bytes em UTF-8.',
            },
            papel: papelEnum,
          },
        },
        response: {
          201: { description: 'Usuário cadastrado', ...usuarioResponseSchema },
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

  app.patch<{
    Params: { id: string };
    Body: { ativo: boolean; versao: number };
  }>(
    '/usuarios/:id/ativo',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Usuários'],
        summary: 'Ativa ou inativa um usuário',
        description:
          'Envie a versão atual do usuário. A operação retorna conflito se a versão estiver desatualizada. O último administrador ativo não pode ser inativado.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['ativo', 'versao'],
          properties: {
            ativo: {
              type: 'boolean',
              description: 'Use true para ativar e false para inativar.',
            },
            versao: {
              type: 'integer',
              minimum: 1,
              description: 'Versão atual do usuário.',
            },
          },
        },
        response: {
          200: {
            description: 'Situação do usuário atualizada',
            ...usuarioResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.alterarAtivo(req.params.id, req.body.ativo, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );

  app.patch<{
    Params: { id: string };
    Body: { papel: PapelUsuario; versao: number };
  }>(
    '/usuarios/:id/papel',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Usuários'],
        summary: 'Altera o papel de um usuário',
        description:
          'Envie a versão atual do usuário. O papel do último administrador ativo não pode ser removido.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['papel', 'versao'],
          properties: {
            papel: papelEnum,
            versao: {
              type: 'integer',
              minimum: 1,
              description: 'Versão atual do usuário.',
            },
          },
        },
        response: {
          200: {
            description: 'Papel do usuário atualizado',
            ...usuarioResponseSchema,
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.alterarPapel(req.params.id, req.body.papel, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );

  app.delete<{ Params: { id: string }; Body: { versao: number } }>(
    '/usuarios/:id',
    {
      preHandler: exigirAdministrador,
      schema: {
        tags: ['Usuários'],
        summary: 'Exclui um usuário sem histórico',
        description:
          'A exclusão física exige a versão atual. Usuários com registros no journal não podem ser excluídos; inative a conta para preservar o histórico. Não é permitido excluir a própria conta.',
        security: [{ bearerAuth: [] }],
        params: paramsId,
        body: schemaVersao,
        response: {
          200: { description: 'Usuário excluído', ...usuarioResponseSchema },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) =>
      res.send(
        await service.deletar(req.params.id, req.body.versao, {
          id: req.user.sub,
          usuario: req.user.usuario,
        })
      )
  );
}
