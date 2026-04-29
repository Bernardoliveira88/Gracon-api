import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

export async function removeMember(request: FastifyRequest, reply: FastifyReply) {
  const removeMemberParamsSchema = z.object({
    userId: z.string().uuid(),
  });

  const { userId } = removeMemberParamsSchema.parse(request.params);
  const workspaceId = request.headers['x-workspace-id'] as string;

  if (!workspaceId) {
    return reply.status(400).send({ message: 'Header x-workspace-id é obrigatório.' });
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
    return reply.status(404).send({ message: 'Membro não encontrado neste workspace.' });
  }

  // Previne que o último admin seja removido (opcional mas recomendado)
  if (workspaceUser.role === 'ADMIN') {
    const adminCount = await prisma.workspaceUser.count({
      where: {
        workspace_id: workspaceId,
        role: 'ADMIN'
      }
    });

    if (adminCount <= 1) {
      return reply.status(400).send({ message: 'Não é possível remover o último ADMIN do workspace.' });
    }
  }

  await prisma.workspaceUser.delete({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: workspaceId
      }
    }
  });

  return reply.status(204).send();
}
