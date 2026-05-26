import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { DocumentService } from '../../../services/document.service.js';

const documentService = new DocumentService();

export async function deleteDocument(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const workspaceId = request.headers['x-workspace-id'] as string;
  const { id } = request.params;

  const doc = await prisma.contractDocument.findFirst({
    where: { id, workspace_id: workspaceId },
  });
  if (!doc) {
    return reply.status(404).send({ ok: false, message: 'Documento não encontrado.' });
  }

  await prisma.contractDocument.delete({ where: { id } });

  try {
    await documentService.deleteFile(doc.file_path);
  } catch (err) {
    request.log.warn({ err, doc_id: id }, 'Falha ao remover arquivo físico do disco');
  }

  return reply.status(204).send();
}
