import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(500).nullable().optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
});

export async function updateTemplate(request: FastifyRequest, reply: FastifyReply) {
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

  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Payload inválido.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.contractTemplate.findFirst({
    where: { id: params.data.id, workspace_id: workspaceId },
  });

  if (!existing) {
    return reply.status(404).send({ ok: false, message: 'Modelo não encontrado.' });
  }

  const template = await prisma.contractTemplate.update({
    where: { id: params.data.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.body !== undefined && { body: parsed.data.body }),
      ...(parsed.data.variables !== undefined && { variables: parsed.data.variables }),
    },
  });

  return reply.status(200).send({ ok: true, data: template });
}
