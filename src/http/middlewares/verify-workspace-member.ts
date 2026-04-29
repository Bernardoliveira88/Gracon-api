import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';

/**
 * Middleware que garante que o usuário pertence ao workspace indicado no header.
 * Deve ser usado APÓS verifyJWT.
 */
export async function verifyWorkspaceMember(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  if (!workspaceId) {
    return reply.status(400).send({ message: 'Header x-workspace-id é obrigatório.' });
  }

  const userId = request.user.sub;

  const membership = await prisma.workspaceUser.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: workspaceId,
      },
    },
  });

  if (!membership) {
    return reply.status(403).send({ message: 'Acesso negado: Você não pertence a este workspace.' });
  }
}
