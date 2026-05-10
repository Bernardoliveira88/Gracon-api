import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { prisma } from '../../../lib/prisma.js';

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const loginBodySchema = z.object({
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
  });

  const { email, password } = loginBodySchema.parse(request.body);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workspaces: {
        include: { workspace: true },
      },
    },
  });

  if (!user) {
    return reply.status(400).send({ message: 'Credenciais inválidas.' });
  }

  const isPasswordValid = await compare(password, user.password_hash);

  if (!isPasswordValid) {
    return reply.status(400).send({ message: 'Credenciais inválidas.' });
  }

  const token = await reply.jwtSign(
    { sub: user.id },
    {
      sign: {
        expiresIn: '7d',
      },
    },
  );

  return reply.status(200).send({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaces: user.workspaces.map((wu) => ({
        id: wu.workspace.id,
        name: wu.workspace.name,
        role: wu.role,
      })),
    },
  });
}
