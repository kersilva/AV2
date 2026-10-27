import { PapelUsuario } from '@domain/enums/PapelUsuario.js';

export const erroSchema = {
  type: 'object',
  properties: {
    erro: { type: 'string' },
    codigo: { type: 'string' },
  },
} as const;

export const respostasErroAuth = {
  401: {
    description: 'Autenticação necessária ou usuário inativo',
    ...erroSchema,
  },
  403: {
    description: 'Sem permissão para esta operação',
    ...erroSchema,
  },
} as const;

export const respostasErroComuns = {
  ...respostasErroAuth,
  400: {
    description: 'Dados de entrada inválidos',
    ...erroSchema,
  },
  404: {
    description: 'Recurso não encontrado',
    ...erroSchema,
  },
  409: {
    description: 'Conflito de versão (outro usuário modificou o recurso)',
    ...erroSchema,
  },
  422: {
    description: 'Regra de negócio violada',
    ...erroSchema,
  },
} as const;

export const papelEnum = {
  type: 'string',
  enum: Object.values(PapelUsuario),
} as const;

export const usuarioResumidoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    usuario: { type: 'string' },
    papel: papelEnum,
    ativo: { type: 'boolean' },
    versao: { type: 'integer' },
  },
} as const;
