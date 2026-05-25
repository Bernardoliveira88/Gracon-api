import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PartyKind, PartyStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(200),
  cnpj: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email('E-mail inválido.').optional().nullable(),
  contact: z.string().trim().max(200).optional().nullable(),
  kind: z.nativeEnum(PartyKind),
  status: z.nativeEnum(PartyStatus).optional(),
});

export async function createParty(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, cnpj, email, contact, kind, status } = parsed.data;

  const party = await prisma.party.create({
    data: {
      workspace_id: workspaceId,
      name,
      cnpj: cnpj ?? null,
      email: email ?? null,
      contact: contact ?? null,
      kind,
      status: status ?? PartyStatus.ACTIVE,
    },
  });

  return reply.status(201).send({ ok: true, data: party });
}
