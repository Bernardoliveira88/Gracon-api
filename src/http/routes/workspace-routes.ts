import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { Role } from '@prisma/client';
import { inviteMember } from '../controllers/workspaces/invite-member.js';
import { updateRole } from '../controllers/workspaces/update-role.js';
import { removeMember } from '../controllers/workspaces/remove-member.js';
import { acceptInvite } from '../controllers/workspaces/accept-invite.js';

export async function workspaceRoutes(app: FastifyInstance) {
  // Todas as rotas de workspace precisam estar autenticadas
  app.addHook('onRequest', verifyJWT);

  app.post(
    '/invites/:token/accept',
    {
      config: {
        rateLimit: { max: 10, timeWindow: '15 minutes' },
      },
      schema: {
        tags: ['Workspaces'],
        summary: 'Aceitar um convite para um workspace',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            token: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    acceptInvite
  );

  app.post(
    '/invites',
    {
      preHandler: [verifyUserRole(Role.ADMIN)],
      schema: {
        tags: ['Workspaces'],
        summary: 'Convidar um membro para o workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        body: {
          type: 'object',
          required: ['email', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'LEGAL', 'FINANCE', 'VIEWER'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              token: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
    },
    inviteMember
  );

  app.patch(
    '/members/:userId/role',
    {
      preHandler: [verifyUserRole(Role.ADMIN)],
      schema: {
        tags: ['Workspaces'],
        summary: 'Atualizar o papel de um membro do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['ADMIN', 'LEGAL', 'FINANCE', 'VIEWER'] },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    updateRole
  );

  app.delete(
    '/members/:userId',
    {
      preHandler: [verifyUserRole(Role.ADMIN)],
      schema: {
        tags: ['Workspaces'],
        summary: 'Remover um membro do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    removeMember
  );
}
