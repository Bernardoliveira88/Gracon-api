import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../lib/prisma.js';
import { DocumentService } from '../../../services/document.service.js';

const documentService = new DocumentService();

export async function downloadDocument(
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

  try {
    const stream = documentService.createReadStream(doc.file_path);
    reply
      .header('Content-Type', doc.mime_type)
      .header('Content-Length', String(doc.size_bytes))
      .header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(doc.name)}"`,
      );
    return reply.send(stream);
  } catch (err) {
    request.log.error({ err }, 'Erro ao fazer stream do documento');
    return reply.status(500).send({ ok: false, message: 'Erro ao ler arquivo.' });
  }
}
