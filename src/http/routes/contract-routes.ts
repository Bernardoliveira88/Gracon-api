import type { FastifyInstance } from "fastify";
import { uploadContract } from "../controllers/contracts/contract-upload.js";
import { decideApproval } from "../controllers/contracts/decide-approval.js";

export async function contractRoutes(app: FastifyInstance) {
  app.post("/upload", uploadContract);

  app.post("/:id/approve", decideApproval);
}