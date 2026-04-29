import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { ContractPipeline } from "../pipelines/contract.pipeline.js";
import type { UploadContractReply } from "../types/contract.types.js";

const pipeline = new ContractPipeline();

export async function contractRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Reply: UploadContractReply }>(
    "/contracts/upload",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              data: { type: "object", additionalProperties: true },
            },
          },
          400: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              message: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<UploadContractReply> => {
      // Nenhum arquivo enviado
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({
          ok: false,
          message: 'Nenhum arquivo enviado. Use o campo "file" no formulário.',
        });
      }

      try {
        const result = await pipeline.run(file);
        return reply.status(200).send({ ok: true, data: result });

      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido.";

        // Erros de validação do PDF ou documento inválido → 400
        const isClientError =
          message.includes("Tipo de arquivo inválido") ||
          message.includes("arquivo vazio") ||
          message.includes("arquivo muito grande") ||
          message.includes("não é um PDF válido") ||
          message.includes("não parece ser um contrato");

        const status = isClientError ? 400 : 500;

        app.log.error({ err, filename: file.filename }, "Erro no pipeline de contratos");

        return reply.status(status).send({ ok: false, message });
      }
    }
  );
}