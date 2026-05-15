import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '../../../lib/prisma.js';

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
    workspace_name: z.string().min(2, 'Nome do workspace deve ter pelo menos 2 caracteres.'),
  });

  const { name, email, password, workspace_name } = registerBodySchema.parse(request.body);

  const userWithSameEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (userWithSameEmail) {
    return reply.status(409).send({ message: 'E-mail já está em uso.' });
  }

  // Custo 10 é o padrão seguro recomendado (custo 6 era muito baixo)
  const password_hash = await hash(password, 10);

  // Transaction atômica: Cria Usuário + Workspace + vínculo como ADMIN
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password_hash,
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        name: workspace_name,
        plan: 'FREE',
      },
    });

    await tx.workspaceUser.create({
      data: {
        user_id: user.id,
        workspace_id: workspace.id,
        role: 'ADMIN',
      },
    });

    return { userId: user.id, workspaceId: workspace.id };
  });

  return reply.status(201).send({
    message: 'Usuário criado com sucesso.',
    userId: result.userId,
    workspaceId: result.workspaceId,
  });
}
