import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../../errors/app-error.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Erros de validação do Zod → 400 com detalhes
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Erro de validação.',
      issues: error.flatten().fieldErrors,
    });
  }

  // Erros de negócio da aplicação → status customizado
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  // Erros de validação do Fastify schema → 400
  if (error.validation) {
    return reply.status(400).send({
      message: 'Erro de validação.',
      issues: error.validation,
    });
  }

  // Qualquer outro erro → 500 (e loga no servidor)
  request.log.error(error);

  return reply.status(500).send({
    message: 'Erro interno do servidor.',
  });
}
