import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export async function getParty(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Parâmetros inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const party = await prisma.party.findFirst({
    where: { id: parsed.data.id, workspace_id: workspaceId },
  });

  if (!party) {
    return reply.status(404).send({ ok: false, message: 'Parte não encontrada.' });
  }

  return reply.status(200).send({ ok: true, data: party });
}
