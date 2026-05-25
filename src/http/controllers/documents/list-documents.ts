import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';

export async function listDocuments(
  request: FastifyRequest<{ Params: { contractId: string } }>,
  reply: FastifyReply,
) {
  const workspaceId = request.headers['x-workspace-id'] as string;
  const { contractId } = request.params;

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!contract) {
    return reply.status(404).send({ ok: false, message: 'Contrato não encontrado.' });
  }

  const docs = await prisma.contractDocument.findMany({
    where: { contract_id: contractId },
    orderBy: { created_at: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return reply.status(200).send({
    ok: true,
    total: docs.length,
    results: docs.map((d) => ({
      id: d.id,
      contract_id: d.contract_id,
      workspace_id: d.workspace_id,
      name: d.name,
      mime_type: d.mime_type,
      size_bytes: d.size_bytes,
      uploaded_by: d.user,
      created_at: d.created_at,
    })),
  });
}

export async function listWorkspaceDocuments(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const docs = await prisma.contractDocument.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { created_at: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      contract: { select: { id: true, title: true } },
    },
  });

  return reply.status(200).send({
    ok: true,
    total: docs.length,
    results: docs.map((d) => ({
      id: d.id,
      contract_id: d.contract_id,
      contract_title: d.contract.title,
      workspace_id: d.workspace_id,
      name: d.name,
      mime_type: d.mime_type,
      size_bytes: d.size_bytes,
      uploaded_by: d.user,
      created_at: d.created_at,
    })),
  });
}
