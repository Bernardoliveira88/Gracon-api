import type { FastifyInstance } from "fastify";
import { uploadContract } from "../controllers/contracts/contract-upload.js";
import { decideApproval } from "../controllers/contracts/decide-approval.js";
import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { uploadContract } from '../controllers/contracts/upload.js';
import { semanticSearch } from '../controllers/contracts/semantic-search.js';
import { uploadContractVersion } from '../controllers/contracts/upload-version.js';
import { listContractVersions } from '../controllers/contracts/list-versions.js';

export async function contractRoutes(app: FastifyInstance) {
  app.post("/upload", uploadContract);

  app.post("/:id/approve", decideApproval);
}
  app.post('/contracts/upload', uploadContract);
  app.get('/contracts/search', semanticSearch);
  
  // Versionamento
  app.post('/contracts/:id/versions', uploadContractVersion);
  app.get('/contracts/:id/versions', listContractVersions);
}
