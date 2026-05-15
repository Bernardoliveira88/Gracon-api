import type { FastifyReply, FastifyRequest } from 'fastify';
import { ContractPipeline } from '../../../pipelines/contract.pipeline.js';
import { ContractService } from '../../../services/contract.service.js';
import { generateTimeline } from './timeline.js';

const contractService = new ContractService();

export async function uploadContract(request: FastifyRequest, reply: FastifyReply) {
  const workspaceId = request.headers['x-workspace-id'] as string;

  const file = await request.file();
  if (!file) {
    return reply.status(400).send({
      ok: false,
      message: 'Nenhum arquivo enviado. Use o campo "file" no formulário.',
    });
  }

  try {
    const pipeline = new ContractPipeline();
    const result = await pipeline.run(file);

    // Persiste no banco de dados (era o que faltava antes!)
    const contract = await contractService.create({
      workspaceId,
      title: result.filename,
      fileUrl: result.filename, // MVP: filename como referência
      pipelineResult: result,
    });

    if (result.extractedData) {
      await generateTimeline(contract.id, result.extractedData);
    }

    return reply.status(201).send({
      ok: true,
      data: {
        contract,
        extraction: result.extractedData,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';

    const isClientError =
      message.includes('Tipo de arquivo inválido') ||
      message.includes('arquivo vazio') ||
      message.includes('arquivo muito grande') ||
      message.includes('não é um PDF válido') ||
      message.includes('não parece ser um contrato');

    const status = isClientError ? 400 : 500;

    request.log.error({ err, filename: file.filename }, 'Erro no pipeline de contratos');

    return reply.status(status).send({ ok: false, message });
  }
}
