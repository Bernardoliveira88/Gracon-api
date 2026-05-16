import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { uploadContract } from '../controllers/contracts/upload.js';
import { decideApproval } from '../controllers/contracts/decide-approval.js';
import { semanticSearch } from '../controllers/contracts/semantic-search.js';
import { uploadContractVersion } from '../controllers/contracts/upload-version.js';
import { listContractVersions } from '../controllers/contracts/list-versions.js';
import { exportReport } from '../controllers/contracts/export-report.js';

export async function contractRoutes(app: FastifyInstance) {
  // Todas as rotas de contrato precisam de autenticação + membro do workspace
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  // Upload e análise de contrato
  app.post('/contracts/upload', uploadContract);

  // Busca semântica
  app.get('/contracts/search', semanticSearch);

  // Aprovações
  app.post('/contracts/:id/approve', decideApproval);

  // Versionamento
  app.post('/contracts/:id/versions', uploadContractVersion);
  app.get('/contracts/:id/versions', listContractVersions);

  // Relatórios
  app.get('/contracts/report', exportReport);
}
