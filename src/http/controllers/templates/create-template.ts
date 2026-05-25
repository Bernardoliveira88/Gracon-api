import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

const bodySchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional().nullable(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
});

export async function createTemplate(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;
  const userId = request.user.sub;

  // ADMIN ou LEGAL podem criar
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

  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Payload inválido.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const template = await prisma.contractTemplate.create({
    data: {
      workspace_id: workspaceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      body: parsed.data.body,
      variables: parsed.data.variables,
      created_by: userId,
    },
  });

  return reply.status(201).send({ ok: true, data: template });
}
