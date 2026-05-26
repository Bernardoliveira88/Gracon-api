/**
 * Gera um JWT válido para um user de teste usando a mesma chave
 * que a aplicação consome (env.JWT_SECRET).
 */
import type { FastifyInstance } from 'fastify';

export async function signTestToken(
  app: FastifyInstance,
  userId: string,
): Promise<string> {
  return app.jwt.sign({ sub: userId }, { expiresIn: '1h' });
}

export function authHeaders(token: string, workspaceId: string) {
  return {
    authorization: `Bearer ${token}`,
    'x-workspace-id': workspaceId,
  };
}
