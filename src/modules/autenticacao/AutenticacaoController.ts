import type { FastifyInstance } from 'fastify';
import type { AutenticacaoService } from '@autenticacao/AutenticacaoService.js';
import { timingSafeEqual } from 'node:crypto';
import { ErroAutenticacao, ErroPermissao } from '@/shared/errors/DomainError.js';
import {
  erroSchema,
  papelEnum,
  respostasErroComuns,
  usuarioResumidoSchema,
} from '@infra/swaggerSchemas.js';

const respostasErroInterno = {
  500: {
    description: 'Erro interno do servidor',
    ...erroSchema,
  },
} as const;

function confereToken(recebido: string, esperado: string) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function AutenticacaoController(app: FastifyInstance, service: AutenticacaoService) {
  app.post<{
    Body: {
      id: string;
      usuario: string;
      senha: string;
      tokenBootstrap: string;
    };
  }>(
    '/auth/primeiro-administrador',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Cadastra o primeiro administrador do sistema',
        description:
          'Cria o usuário administrador inicial utilizando um token de bootstrap configurado no ambiente.',
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'usuario', 'senha', 'tokenBootstrap'],
          properties: {
            id: {
              type: 'string',
              minLength: 1,
              description: 'Identificador único do administrador.',
            },
            usuario: {
              type: 'string',
              minLength: 1,
              description: 'Nome de usuário para login.',
            },
            senha: {
              type: 'string',
              description: 'Senha de acesso do administrador.',
            },
            tokenBootstrap: {
              type: 'string',
              minLength: 1,
              description: 'Token secreto de bootstrap configurado no ambiente.',
            },
          },
        },
        response: {
          201: {
            description: 'Primeiro administrador criado com sucesso',
            type: 'object',
            additionalProperties: false,
            required: ['id', 'usuario', 'papel'],
            properties: {
              id: { type: 'string' },
              usuario: { type: 'string' },
              papel: papelEnum,
            },
          },
          ...respostasErroComuns,
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => {
      const esperado = process.env.ADMIN_BOOTSTRAP_TOKEN;
      if (!esperado || !confereToken(req.body.tokenBootstrap, esperado))
        throw new ErroPermissao('Token de configuração inicial inválido.');
      const usuario = await service.criarPrimeiroAdmin(req.body);
      return res.code(201).send({
        id: usuario.id,
        usuario: usuario.usuario,
        papel: usuario.papel,
      });
    }
  );

  app.post<{ Body: { usuario: string; senha: string } }>(
    '/auth/login',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Realiza a autenticação do usuário',
        description:
          'Autentica as credenciais do usuário e retorna um token JWT para acesso às rotas protegidas.',
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['usuario', 'senha'],
          properties: {
            usuario: {
              type: 'string',
              minLength: 1,
              description: 'Nome de usuário.',
            },
            senha: {
              type: 'string',
              minLength: 1,
              description: 'Senha do usuário.',
            },
          },
        },
        response: {
          200: {
            description: 'Autenticação realizada com sucesso',
            type: 'object',
            additionalProperties: false,
            required: ['token', 'tipo', 'expiraEmSegundos'],
            properties: {
              token: {
                type: 'string',
                description: 'Token JWT para autorização.',
              },
              tipo: {
                type: 'string',
                example: 'Bearer',
                description: 'Tipo do token retornado.',
              },
              expiraEmSegundos: {
                type: 'integer',
                example: 1800,
                description: 'Tempo de expiração do token em segundos.',
              },
            },
          },
          401: {
            description: 'Credenciais inválidas ou usuário inativo',
            ...erroSchema,
          },
          ...respostasErroInterno,
        },
      },
    },
    async (req, res) => {
      const usuario = await service.autenticar(req.body.usuario, req.body.senha);
      if (!usuario) throw new ErroAutenticacao('Usuário ou senha inválidos.');
      const token = await res.jwtSign(
        { sub: usuario.id, usuario: usuario.usuario, papel: usuario.papel },
        { expiresIn: '30m' }
      );
      return res.send({ token, tipo: 'Bearer', expiraEmSegundos: 1800 });
    }
  );
}
