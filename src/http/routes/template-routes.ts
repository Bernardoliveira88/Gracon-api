import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { listTemplates } from '../controllers/templates/list-templates.js';
import { getTemplate } from '../controllers/templates/get-template.js';
import { createTemplate } from '../controllers/templates/create-template.js';
import { updateTemplate } from '../controllers/templates/update-template.js';
import { deleteTemplate } from '../controllers/templates/delete-template.js';

export async function templateRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  app.get(
    '/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Listar modelos de contrato do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
              results: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
    },
    listTemplates
  );

  app.get(
    '/templates/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Obter detalhes de um modelo',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    getTemplate
  );

  app.post(
    '/templates',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Criar um novo modelo (ADMIN ou LEGAL)',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        body: {
          type: 'object',
          required: ['name', 'body'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            body: { type: 'string' },
            variables: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    createTemplate
  );

  app.patch(
    '/templates/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Atualizar um modelo (ADMIN ou LEGAL)',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            body: { type: 'string' },
            variables: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    updateTemplate
  );

  app.delete(
    '/templates/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Excluir um modelo (ADMIN ou LEGAL)',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    deleteTemplate
  );
}
