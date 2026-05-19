import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { EmbeddingService } from '../../../services/embedding.service.js';
import { prisma } from '../../../lib/prisma.js'; // <--- Importa o Prisma para listar direto quando q estiver vazio

const embeddingService = new EmbeddingService();

// Mudamos o Zod para aceitar string vazia e definir valores padrão limpos
const searchQuerySchema = z.object({
  q: z.string().optional().default(''), 
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
  const searchTerm = q.trim();

  try {
    // 💡 CASO 1: Se a query estiver vazia, lista todos os contratos do workspace direto do banco
    if (searchTerm === '') {
      const allContracts = await prisma.contract.findMany({
        where: {
          workspace_id: workspaceId,
        },
        orderBy: {
          created_at: 'desc', // Traz os mais recentes primeiro
        },
        take: limit,
      });

      return reply.status(200).send({
        ok: true,
        query: '',
        total: allContracts.length,
        results: allContracts.map((c) => ({
          contract_id: c.id,
          title: c.title,
          status: c.status,
          similarity: 1.0000, // Similaridade máxima padrão para listagem comum
          snippet: `Contrato: ${c.title}`,
        })),
      });
    }

    // 💡 CASO 2: Se o usuário digitou algo, executa a busca semântica tradicional por IA
    const results = await embeddingService.semanticSearch(searchTerm, workspaceId, limit);

    return reply.status(200).send({
      ok: true,
      query: searchTerm,
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
    request.log.error({ err, query: searchTerm }, 'Erro na busca semântica');
    return reply.status(500).send({ ok: false, message });
  }
}
