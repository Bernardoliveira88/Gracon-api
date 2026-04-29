import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { Role } from '@prisma/client';

export async function updateRole(request: FastifyRequest, reply: FastifyReply) {
  const updateRoleParamsSchema = z.object({
    userId: z.string().uuid(),
  });

  const updateRoleBodySchema = z.object({
    role: z.nativeEnum(Role),
  });

  const { userId } = updateRoleParamsSchema.parse(request.params);
  const { role } = updateRoleBodySchema.parse(request.body);
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

  await prisma.workspaceUser.update({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: workspaceId
      }
    },
    data: {
      role
    }
  });

  return reply.status(204).send();
}
