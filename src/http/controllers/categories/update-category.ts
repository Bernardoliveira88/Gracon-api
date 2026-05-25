import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    color: z
      .string()
      .trim()
      .regex(/^#?[0-9a-fA-F]{3,8}$/u, 'Cor deve ser hexadecimal.')
      .optional()
      .nullable(),
    icon: z.string().trim().max(64).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nenhum campo para atualizar.' });

export async function updateCategory(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const params = paramsSchema.safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ ok: false, message: 'ID inválido.' });
  }

  const parsed = updateCategorySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      ok: false,
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.category.findFirst({
    where: { id: params.data.id, workspace_id: workspaceId },
  });

  if (!existing) {
    return reply.status(404).send({ ok: false, message: 'Categoria não encontrada.' });
  }

  const category = await prisma.category.update({
    where: { id: params.data.id },
    data: parsed.data,
  });

  return reply.status(200).send({
    ok: true,
    data: category,
  });
}
