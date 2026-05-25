import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function getTemplate(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: 'ID inválido.' });
  }

  const template = await prisma.contractTemplate.findFirst({
    where: { id: parsed.data.id, workspace_id: workspaceId },
  });

  if (!template) {
    return reply.status(404).send({ ok: false, message: 'Modelo não encontrado.' });
  }

  return reply.status(200).send({ ok: true, data: template });
}
