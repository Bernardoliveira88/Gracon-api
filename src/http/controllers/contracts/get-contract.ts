import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { mapContractStatusToUi, mapPartyTypeToUi } from '../../../types/status.js';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function getContract(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ message: 'ID inválido.' });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.data.id },
    include: {
      data: true,
      parties: true,
      clauses: true,
      events: { orderBy: { scheduled_for: 'asc' } },
      approvals: { include: { user: true } },
    },
  });

  if (!contract) {
    return reply.status(404).send({ ok: false, message: 'Contrato não encontrado.' });
  }

  return reply.status(200).send({
    ok: true,
    data: {
      contract: {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        status_display: mapContractStatusToUi(contract.status),
        file_url: contract.file_url,
        created_at: contract.created_at,
        updated_at: contract.updated_at,
      },
      extraction: {
        parties: contract.parties.map((p) => ({
          ...p,
          type_display: mapPartyTypeToUi(p.type),
        })),
        clauses: contract.clauses,
        risks: contract.events
          .filter((e) => e.type === 'EXPIRATION' || e.type === 'RENEWAL')
          .map((e) => ({ type: e.type, date: e.scheduled_for, description: e.description })),
        dates: {
          start_date: contract.data?.start_date ?? null,
          end_date: contract.data?.end_date ?? null,
        },
        summary: contract.data?.raw_gemini_json ?? null,
      },
    },
  });
}