import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { ContractPipeline } from "../pipelines/contract.pipeline.js";
import type { UploadContractReply } from "../types/contract.types.js";

const pipeline = new ContractPipeline();

export async function contractRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /contracts/upload
   * Recebe um PDF via multipart/form-data (campo: "file")
   * Retorna os dados extraídos pelo Gemini
   */
  app.post<{ Reply: UploadContractReply }>(
    "/contracts/upload",
    {
      schema: {
  response: {
    200: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        data: { 
          type: "object",
          additionalProperties: true
        },
      },
    },
  },
},
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<UploadContractReply> => {
      // Obtém o arquivo do multipart
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          ok: false,
          message: 'Nenhum arquivo enviado. Use o campo "file" no formulário.',
        });
      }

      const result = await pipeline.run(file);

      return reply.status(200).send({
        ok: true,
        data: result,
      });
    }
  );
}
