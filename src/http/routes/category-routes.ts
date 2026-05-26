import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { listCategories } from '../controllers/categories/list-categories.js';
import { createCategory } from '../controllers/categories/create-category.js';
import { updateCategory } from '../controllers/categories/update-category.js';
import { deleteCategory } from '../controllers/categories/delete-category.js';

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  app.get(
    '/categories',
    {
      schema: {
        tags: ['Categories'],
        summary: 'Listar categorias do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              total: { type: 'number' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    color: { type: ['string', 'null'] },
                    icon: { type: ['string', 'null'] },
                    contracts_count: { type: 'number' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    listCategories
  );

  app.post(
    '/categories',
    {
      preHandler: [verifyUserRole(Role.LEGAL)],
      schema: {
        tags: ['Categories'],
        summary: 'Criar nova categoria (ADMIN ou LEGAL)',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            description: { type: 'string', maxLength: 500, nullable: true },
            color: { type: 'string', nullable: true },
            icon: { type: 'string', maxLength: 64, nullable: true },
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
    createCategory
  );

  app.patch(
    '/categories/:id',
    {
      preHandler: [verifyUserRole(Role.LEGAL)],
      schema: {
        tags: ['Categories'],
        summary: 'Atualizar categoria (ADMIN ou LEGAL)',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            description: { type: 'string', maxLength: 500, nullable: true },
            color: { type: 'string', nullable: true },
            icon: { type: 'string', maxLength: 64, nullable: true },
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
    updateCategory
  );

  app.delete(
    '/categories/:id',
    {
      preHandler: [verifyUserRole(Role.LEGAL)],
      schema: {
        tags: ['Categories'],
        summary: 'Remover categoria (ADMIN ou LEGAL)',
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
    deleteCategory
  );
}
