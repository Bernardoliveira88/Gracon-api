import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { DocumentService } from '../../../services/document.service.js';

const documentService = new DocumentService();

export async function uploadDocument(
  request: FastifyRequest<{ Params: { contractId: string } }>,
  reply: FastifyReply,
) {
  const workspaceId = request.headers['x-workspace-id'] as string;
  const { contractId } = request.params;
  const userId = request.user.sub;

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!contract) {
    return reply.status(404).send({ ok: false, message: 'Contrato não encontrado.' });
  }

  const file = await request.file();
  if (!file) {
    return reply.status(400).send({
      ok: false,
      message: 'Nenhum arquivo enviado. Use o campo "file".',
    });
  }

  try {
    const saved = await documentService.saveFromMultipart(file, workspaceId);
    const doc = await prisma.contractDocument.create({
      data: {
        contract_id: contractId,
        workspace_id: workspaceId,
        name: saved.originalName,
        mime_type: saved.mimeType,
        size_bytes: saved.sizeBytes,
        file_path: saved.filePath,
        uploaded_by: userId,
      },
    });
    return reply.status(201).send({ ok: true, data: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    const isClientError =
      message.includes('Tipo de arquivo inválido') ||
      message.includes('arquivo vazio') ||
      message.includes('muito grande');
    return reply.status(isClientError ? 400 : 500).send({ ok: false, message });
  }
}
