import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { Role } from '@prisma/client';

export function verifyUserRole(roleToVerify: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const workspaceId = request.headers['x-workspace-id'] as string;

    if (!workspaceId) {
      return reply.status(400).send({ message: 'Header x-workspace-id é obrigatório.' });
    }

    const userId = request.user.sub;

    const workspaceUser = await prisma.workspaceUser.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: userId,
          workspace_id: workspaceId,
        },
      },
    });

    if (!workspaceUser) {
      return reply.status(403).send({ message: 'Acesso negado: Você não pertence a este workspace.' });
    }

    // ADMIN tem acesso a tudo; demais precisam do papel exato
    if (workspaceUser.role !== Role.ADMIN && workspaceUser.role !== roleToVerify) {
      return reply.status(403).send({ message: `Acesso negado: Exige o papel ${roleToVerify}.` });
    }
  };
}
