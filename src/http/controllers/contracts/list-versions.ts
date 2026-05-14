import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';

export async function listContractVersions(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const workspaceId = request.headers['x-workspace-id'] as string;

  const contract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!contract || contract.workspace_id !== workspaceId) {
    return reply.status(404).send({
      ok: false,
      message: 'Contrato não encontrado ou não pertence a este workspace.',
    });
  }

  const versions = await prisma.contractVersion.findMany({
    where: { contract_id: id },
    orderBy: { version_num: 'desc' },
  });

  return reply.status(200).send({
    ok: true,
    data: versions,
  });
}
