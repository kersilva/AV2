// src/infrastructure/swaggerConfig.ts

import type { SwaggerOptions } from '@fastify/swagger';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

export const swaggerOptions: SwaggerOptions = {
  openapi: {
    info: {
      title: 'GreenCode API',
      description: 'Sistema de gestão de equipamentos eletrônicos para reciclagem.',
      version: '1.0.0',
      contact: {
        name: 'Técnicas de Programação - AV2',
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Autenticação', description: 'Login e emissão de token JWT' },
      { name: 'Usuários', description: 'Gestão de usuários e papéis' },
      { name: 'Organizações', description: 'Cadastro de organizações' },
      { name: 'Contratos', description: 'Contratos vinculados a organizações' },
      { name: 'Lotes', description: 'Recebimento e triagem de lotes' },
      { name: 'Equipamentos', description: 'Equipamentos e movimentações' },
      { name: 'Auditoria', description: 'Consulta ao journal' },
      { name: 'Relatórios', description: 'Relatórios e dashboards' },
      { name: 'Configuração', description: 'Configurações do sistema' },
    ],
  },
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    persistAuthorization: true,
  },
  uiHooks: {
    onRequest: function (_request, _reply, next) {
      next();
    },
    preHandler: function (_request, _reply, next) {
      next();
    },
  },
};
