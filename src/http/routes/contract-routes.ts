import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { uploadContract } from '../controllers/contracts/upload.js';

export async function contractRoutes(app: FastifyInstance) {
  // Todas as rotas de contrato exigem autenticação + membership no workspace
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  app.post('/contracts/upload', uploadContract);
}
