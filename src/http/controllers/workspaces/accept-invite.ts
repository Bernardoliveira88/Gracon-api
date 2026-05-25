import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

export async function acceptInvite(request: FastifyRequest, reply: FastifyReply) {
  const acceptInviteParamsSchema = z.object({
    token: z.string().uuid('Token inválido.'),
  });

  const { token } = acceptInviteParamsSchema.parse(request.params);
  const userId = request.user.sub;

  // Busca o usuário logado para validar o e-mail
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return reply.status(404).send({ message: 'Usuário não encontrado.' });
  }

  // Busca o convite pelo token
  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    return reply.status(404).send({ message: 'Convite não encontrado ou inválido.' });
  }

  if (invite.expires_at < new Date()) {
    return reply.status(400).send({ message: 'Este convite já expirou.' });
  }

  if (invite.email !== user.email) {
    return reply.status(403).send({ message: 'Este convite foi enviado para outro e-mail.' });
  }

  // Verifica se o usuário já está no workspace
  const existingMember = await prisma.workspaceUser.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: user.id,
        workspace_id: invite.workspace_id,
      },
    },
  });

  if (existingMember) {
    return reply.status(409).send({ message: 'Você já faz parte deste workspace.' });
  }

  // Transação atômica: adiciona ao workspace + deleta o convite
  await prisma.$transaction(async (tx) => {
    await tx.workspaceUser.create({
      data: {
        user_id: user.id,
        workspace_id: invite.workspace_id,
        role: invite.role,
      },
    });

    await tx.invite.delete({
      where: { id: invite.id },
    });
  });

  return reply.status(200).send({ message: 'Convite aceito com sucesso!' });
}
