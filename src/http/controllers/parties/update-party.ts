import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PartyKind, PartyStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    cnpj: z.string().trim().max(32).nullable().optional(),
    email: z.string().trim().email('E-mail inválido.').nullable().optional(),
    contact: z.string().trim().max(200).nullable().optional(),
    kind: z.nativeEnum(PartyKind).optional(),
    status: z.nativeEnum(PartyStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser informado.',
  });

export async function updateParty(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const paramsParsed = paramsSchema.safeParse(request.params);
  if (!paramsParsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Parâmetros inválidos.',
      errors: paramsParsed.error.flatten().fieldErrors,
    });
  }

  const bodyParsed = bodySchema.safeParse(request.body);
  if (!bodyParsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Dados inválidos.',
      errors: bodyParsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.party.findFirst({
    where: { id: paramsParsed.data.id, workspace_id: workspaceId },
  });

  if (!existing) {
    return reply.status(404).send({ ok: false, message: 'Parte não encontrada.' });
  }

  const party = await prisma.party.update({
    where: { id: existing.id },
    data: bodyParsed.data,
  });

  return reply.status(200).send({ ok: true, data: party });
}
