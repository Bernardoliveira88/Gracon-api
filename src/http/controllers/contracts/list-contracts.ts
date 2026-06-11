import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { mapContractStatusToUi } from '../../../types/status.js';

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
    .pipe(z.number().min(1).max(100)),
});

export async function listContracts(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = listQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Parâmetros inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        file_url: true,
        created_at: true,
        updated_at: true,
        data: {
          select: { value: true, start_date: true, end_date: true },
        },
        parties: {
          select: { name: true, type: true },
        },
      },
    }),
    prisma.contract.count({
      where: { workspace_id: workspaceId },
    }),
  ]);

  return reply.status(200).send({
    ok: true,
    total,
    page,
    limit,
    results: contracts.map((c) => {
      // Contraparte = quem foi contratado; fallback para a primeira party
      const counterparty =
        c.parties.find((p) => p.type === 'HIRED')?.name ?? c.parties[0]?.name ?? null;

      return {
        contract_id: c.id,
        title: c.title,
        status: c.status,
        status_display: mapContractStatusToUi(c.status),
        file_url: c.file_url,
        value: c.data?.value ?? null,
        start_date: c.data?.start_date ?? null,
        end_date: c.data?.end_date ?? null,
        counterparty,
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    }),
  });
}
