import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { Role } from '@prisma/client';

export function verifyUserRole(roleToVerify: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Pega o ID do workspace pelo header da requisição
    const workspaceId = request.headers['x-workspace-id'] as string;
    
    if (!workspaceId) {
      return reply.status(400).send({ message: 'Header x-workspace-id é obrigatório.' });
    }

    // @ts-ignore
    const userId = request.user?.sub;

    if (!userId) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    const workspaceUser = await prisma.workspaceUser.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: userId,
          workspace_id: workspaceId
        }
      }
    });

    if (!workspaceUser) {
      return reply.status(403).send({ message: 'Acesso negado: Você não pertence a este workspace.' });
    }

    // Se ele for admin, tem acesso a tudo. Se não, tem que ter o papel exato.
    if (workspaceUser.role !== Role.ADMIN && workspaceUser.role !== roleToVerify) {
      return reply.status(403).send({ message: `Acesso negado: Exige o papel ${roleToVerify}.` });
    }
  };
}
