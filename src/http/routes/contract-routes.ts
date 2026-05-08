import type { FastifyInstance } from "fastify";
import { uploadContract } from "../controllers/contracts/contract-upload.js";

export async function contractRoutes(app: FastifyInstance) {
  app.post("/upload", uploadContract);
}