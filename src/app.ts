import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { errorHandler } from './http/middlewares/error-handler.js';
import { authRoutes } from './http/routes/auth-routes.js';
import { workspaceRoutes } from './http/routes/workspace-routes.js';
import { contractRoutes } from './http/routes/contract-routes.js';
import { documentRoutes } from './http/routes/document-routes.js';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

// Augmentação de tipos do JWT está em ./types/fastify.d.ts (carregada via tsconfig)

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV !== 'test',
  });



  // Plugins
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  });

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'NexusDoc API',
        description: 'API para gestão inteligente de contratos',
        version: '1.0.0',
      },
      tags: [
        { name: 'Auth', description: 'Autenticação de usuários' },
        { name: 'Workspaces', description: 'Gestão de workspaces e membros' },
        { name: 'Contracts', description: 'Gestão, upload e busca de contratos' },
        { name: 'Documents', description: 'Anexos (documentos) vinculados a contratos' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          workspaceId: {
            type: 'apiKey',
            name: 'x-workspace-id',
            in: 'header',
          },
        },
      },
    },
  });

  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Error handler global
  app.setErrorHandler(errorHandler);

  // Rotas
  app.register(authRoutes, { prefix: '/auth' });
  app.register(workspaceRoutes, { prefix: '/workspaces' });
  app.register(contractRoutes);
  app.register(documentRoutes);

  // Healthcheck
  app.get('/', async (_request, reply) => {
    return reply.send({
      status: 'NexusDoc API Online 🚀',
      environment: env.NODE_ENV,
    });
  });

  return app;
}
