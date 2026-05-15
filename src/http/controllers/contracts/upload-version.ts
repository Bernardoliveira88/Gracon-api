import type { FastifyReply, FastifyRequest } from 'fastify';
import { ContractPipeline } from '../../../pipelines/contract.pipeline.js';
import { ContractService } from '../../../services/contract.service.js';
import { prisma } from '../../../lib/prisma.js';
import { generateTimeline } from './timeline.js';

const contractService = new ContractService();

export async function uploadContractVersion(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const workspaceId = request.headers['x-workspace-id'] as string;

  // Verifica se o contrato existe e pertence ao workspace
  const contract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!contract || contract.workspace_id !== workspaceId) {
    return reply.status(404).send({
      ok: false,
      message: 'Contrato não encontrado ou não pertence a este workspace.',
    });
  }

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

    // Adiciona nova versão (substitui os dados, salva novo arquivo e histórico)
    const updatedContract = await contractService.addVersion(id, {
      title: result.filename, // Ou manter o título antigo, mas a pipeline usa o filename como fallback
      fileUrl: result.filename, // MVP: filename como referência
      pipelineResult: result,
    });

    if (result.extractedData) {
      await prisma.timelineEvent.deleteMany({ where: { contract_id: id } });
      await generateTimeline(id, result.extractedData);
    }

    return reply.status(201).send({
      ok: true,
      data: {
        contract: updatedContract,
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

    request.log.error({ err, filename: file.filename, contractId: id }, 'Erro no pipeline de nova versão');

    return reply.status(status).send({ ok: false, message });
  }
}
