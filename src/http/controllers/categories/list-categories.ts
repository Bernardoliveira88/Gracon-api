import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../../lib/prisma.js';

export async function listCategories(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const categories = await prisma.category.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      icon: true,
      created_at: true,
      updated_at: true,
      _count: { select: { contracts: true } },
    },
  });

  return reply.status(200).send({
    ok: true,
    total: categories.length,
    results: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      contracts_count: c._count.contracts,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),
  });
}
