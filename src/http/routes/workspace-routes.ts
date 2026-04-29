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

  // Rota para aceitar convite (só precisa estar logado, não precisa de Role no workspace)
  app.post('/invites/:token/accept', acceptInvite);

  // Somente ADMIN pode gerenciar membros
  app.post('/invites', { preHandler: [verifyUserRole(Role.ADMIN)] }, inviteMember);
  app.patch('/members/:userId/role', { preHandler: [verifyUserRole(Role.ADMIN)] }, updateRole);
  app.delete('/members/:userId', { preHandler: [verifyUserRole(Role.ADMIN)] }, removeMember);
}
