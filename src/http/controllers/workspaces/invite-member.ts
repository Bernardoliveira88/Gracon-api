import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';

export async function inviteMember(request: FastifyRequest, reply: FastifyReply) {
  const inviteBodySchema = z.object({
    email: z.string().email('E-mail inválido.'),
    role: z.nativeEnum(Role),
  });

  const { email, role } = inviteBodySchema.parse(request.body);
  const workspaceId = request.headers['x-workspace-id'] as string;

  // Verifica se o usuário já está no workspace
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    const existingMember = await prisma.workspaceUser.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: user.id,
          workspace_id: workspaceId,
        },
      },
    });

    if (existingMember) {
      return reply.status(409).send({ message: 'Usuário já pertence a este workspace.' });
    }
  }

  // Cria o convite com expiração de 7 dias
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.invite.create({
    data: {
      email,
      role,
      workspace_id: workspaceId,
      token,
      expires_at: expiresAt,
    },
  });

  return reply.status(201).send({
    message: 'Convite criado com sucesso.',
    token,
  });
}
