import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PartyKind, PartyStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().min(1).max(200)),
  kind: z.nativeEnum(PartyKind).optional(),
  status: z.nativeEnum(PartyStatus).optional(),
  q: z.string().trim().min(1).optional(),
});

export async function listParties(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Parâmetros inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { page, limit, kind, status, q } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    workspace_id: workspaceId,
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { contact: { contains: q, mode: 'insensitive' as const } },
            { cnpj: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [parties, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.party.count({ where }),
  ]);

  return reply.status(200).send({
    ok: true,
    total,
    page,
    limit,
    results: parties,
  });
}
