import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { errorHandler } from './http/middlewares/error-handler.js';
import { authRoutes } from './http/routes/auth-routes.js';
import { workspaceRoutes } from './http/routes/workspace-routes.js';
import { contractRoutes } from './http/routes/contract-routes.js';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Importa a augmentação de tipos do JWT
import './types/fastify.d.js';

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV !== 'test',
  });

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NexusDoc API',
        description: 'API de gestão inteligente de contratos empresariais',
        version: '1.0.0',
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
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Plugins
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  });

  // Error handler global
  app.setErrorHandler(errorHandler);

  // Rotas
  app.register(authRoutes, { prefix: '/auth' });
  app.register(workspaceRoutes, { prefix: '/workspaces' });
  app.register(contractRoutes);

  // Healthcheck
  app.get('/', async (_request, reply) => {
    return reply.send({
      status: 'NexusDoc API Online 🚀',
      environment: env.NODE_ENV,
    });
  });

  return app;
}
