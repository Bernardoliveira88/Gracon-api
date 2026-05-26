import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './http/middlewares/error-handler.js';
import { authRoutes } from './http/routes/auth-routes.js';
import { workspaceRoutes } from './http/routes/workspace-routes.js';
import { contractRoutes } from './http/routes/contract-routes.js';
import { categoryRoutes } from './http/routes/category-routes.js';
import { templateRoutes } from './http/routes/template-routes.js';
import { partyRoutes } from './http/routes/party-routes.js';
import { documentRoutes } from './http/routes/document-routes.js';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

// Augmentação de tipos do JWT está em ./types/fastify.d.ts (carregada via tsconfig)

// Limite global do body (25 MB) — uploads de PDF
const BODY_LIMIT_BYTES = 25 * 1024 * 1024;

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV !== 'test',
    bodyLimit: BODY_LIMIT_BYTES,
  });

  // --- Segurança / infraestrutura HTTP (registrar ANTES das rotas) ---

  // Headers de segurança (CSP relaxado para permitir /docs do Swagger UI)
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS — libera o frontend configurado em FRONTEND_URL
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Compressão de resposta (brotli + gzip), aplicada globalmente
  await app.register(compress, {
    global: true,
    encodings: ['br', 'gzip'],
  });

  // Rate limiting — global desabilitado; aplicado por rota via `config.rateLimit`
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  // --- Plugins de aplicação ---

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
        { name: 'Categories', description: 'Gestão de categorias de contratos' },
        { name: 'Templates', description: 'Modelos reutilizáveis de contratos' },
        { name: 'Parties', description: 'Gestão de partes do workspace (clientes, fornecedores, parceiros)' },
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
  app.register(categoryRoutes);
  app.register(templateRoutes);
  app.register(partyRoutes);
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
