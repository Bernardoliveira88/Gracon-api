import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteCategory(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const params = paramsSchema.safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ ok: false, message: 'ID inválido.' });
  }

  const existing = await prisma.category.findFirst({
    where: { id: params.data.id, workspace_id: workspaceId },
  });

  if (!existing) {
    return reply.status(404).send({ ok: false, message: 'Categoria não encontrada.' });
  }

  await prisma.category.delete({
    where: { id: params.data.id },
  });

  return reply.status(204).send();
}
