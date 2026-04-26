import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '../../../lib/prisma.js';

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    workspace_name: z.string(),
  });

  const { name, email, password, workspace_name } = registerBodySchema.parse(request.body);

  const userWithSameEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (userWithSameEmail) {
    return reply.status(409).send({ message: 'E-mail already exists.' });
  }

  const password_hash = await hash(password, 6);

  // Prisma Transaction: Cria Usuário, Workspace e a ligação entre eles como Admin.
  await prisma.$transaction(async (tx) => {
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
        plan: 'free',
      },
    });

    await tx.workspaceUser.create({
      data: {
        user_id: user.id,
        workspace_id: workspace.id,
        role: 'admin',
      },
    });
  });

  return reply.status(201).send();
}
