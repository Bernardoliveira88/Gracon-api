import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { Role } from '@prisma/client';

export async function updateRole(request: FastifyRequest, reply: FastifyReply) {
  const updateRoleParamsSchema = z.object({
    userId: z.string().uuid('ID de usuário inválido.'),
  });

  const updateRoleBodySchema = z.object({
    role: z.nativeEnum(Role),
  });

  const { userId } = updateRoleParamsSchema.parse(request.params);
  const { role } = updateRoleBodySchema.parse(request.body);
  const workspaceId = request.headers['x-workspace-id'] as string;

  const workspaceUser = await prisma.workspaceUser.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: workspaceId,
      },
    },
  });

  if (!workspaceUser) {
    return reply.status(404).send({ message: 'Membro não encontrado neste workspace.' });
  }

  // Previne rebaixamento do último admin
  if (workspaceUser.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.workspaceUser.count({
      where: {
        workspace_id: workspaceId,
        role: 'ADMIN',
      },
    });

    if (adminCount <= 1) {
      return reply.status(400).send({
        message: 'Não é possível alterar o papel do último ADMIN do workspace.',
      });
    }
  }

  await prisma.workspaceUser.update({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: workspaceId,
      },
    },
    data: { role },
  });

  return reply.status(204).send();
}
