import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { EmbeddingService } from '../../../services/embedding.service.js';

const embeddingService = new EmbeddingService();

const searchQuerySchema = z.object({
  q: z.string().min(3, 'A busca deve ter no mínimo 3 caracteres.'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1).max(50)),
});

export async function semanticSearch(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = searchQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Parâmetros de busca inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { q, limit } = parsed.data;

  try {
    const results = await embeddingService.semanticSearch(q, workspaceId, limit);

    return reply.status(200).send({
      ok: true,
      query: q,
      total: results.length,
      results: results.map((r) => ({
        contract_id: r.contract_id,
        title: r.title,
        status: r.status,
        similarity: parseFloat(Number(r.similarity).toFixed(4)),
        snippet: r.content_text.slice(0, 300),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro na busca semântica.';
    request.log.error({ err, query: q }, 'Erro na busca semântica');
    return reply.status(500).send({ ok: false, message });
  }
}
