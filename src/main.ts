import 'dotenv/config';
import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyJwt from '@fastify/jwt';
import { compositionRoot } from '@infra/compositionRoot.js';
import { registrarErrorHandler } from '@infra/errorHandler.js';
import { ErroValidacao } from '@/shared/errors/DomainError.js';
import { prisma } from '@infra/database.js';
import { swaggerOptions, swaggerUiOptions } from '@/infrastructure/swaggerConfig.js';

const secret = process.env.JWT_SECRET;

if (!secret || Buffer.byteLength(secret) < 32)
  throw new ErroValidacao('Defina JWT_SECRET com pelo menos 32 caracteres no .env.');

const app = Fastify({ logger: true });
registrarErrorHandler(app);

await app.register(fastifySwagger, swaggerOptions);
await app.register(fastifySwaggerUi, swaggerUiOptions);

await app.register(fastifyJwt, { secret });
await compositionRoot(app);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`Documentação disponível em http://localhost:${port}/docs`);

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());


