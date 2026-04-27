import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { prisma } from '../../../lib/prisma.js';

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const loginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const { email, password } = loginBodySchema.parse(request.body);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return reply.status(400).send({ message: 'Invalid credentials.' });
  }

  const isPasswordValid = await compare(password, user.password_hash);

  if (!isPasswordValid) {
    return reply.status(400).send({ message: 'Invalid credentials.' });
  }

  const token = await reply.jwtSign(
    {},
    {
      sign: {
        sub: user.id,
        expiresIn: '7d',
      },
    }
  );

  return reply.status(200).send({ token });
}
