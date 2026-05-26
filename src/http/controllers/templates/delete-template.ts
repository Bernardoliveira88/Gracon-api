import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;
  const userId = request.user.sub;

  const membership = await prisma.workspaceUser.findUnique({
    where: {
      user_id_workspace_id: { user_id: userId, workspace_id: workspaceId },
    },
  });

  if (!membership || (membership.role !== Role.ADMIN && membership.role !== Role.LEGAL)) {
    return reply.status(403).send({
      ok: false,
      message: 'Acesso negado: Exige papel ADMIN ou LEGAL.',
    });
  }

  const params = paramsSchema.safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ ok: false, message: 'ID inválido.' });
  }

  const existing = await prisma.contractTemplate.findFirst({
    where: { id: params.data.id, workspace_id: workspaceId },
  });

  if (!existing) {
    return reply.status(404).send({ ok: false, message: 'Modelo não encontrado.' });
  }

  await prisma.contractTemplate.delete({ where: { id: params.data.id } });

  return reply.status(204).send();
}
