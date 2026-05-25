import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export async function deleteParty(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Parâmetros inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.party.findFirst({
    where: { id: parsed.data.id, workspace_id: workspaceId },
  });

  if (!existing) {
    return reply.status(404).send({ ok: false, message: 'Parte não encontrada.' });
  }

  await prisma.party.delete({ where: { id: existing.id } });

  return reply.status(204).send();
}
