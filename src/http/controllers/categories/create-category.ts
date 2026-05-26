import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(80),
  description: z.string().trim().max(500).optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{3,8}$/u, 'Cor deve ser hexadecimal.')
    .optional()
    .nullable(),
  icon: z.string().trim().max(64).optional().nullable(),
});

export async function createCategory(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const parsed = createCategorySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, description, color, icon } = parsed.data;

  const category = await prisma.category.create({
    data: {
      workspace_id: workspaceId,
      name,
      description: description ?? null,
      color: color ?? null,
      icon: icon ?? null,
    },
  });

  return reply.status(201).send({
    ok: true,
    data: category,
  });
}
