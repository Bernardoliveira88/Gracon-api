import { prisma } from '../lib/prisma.js';
import type { ExtractedContractData, PipelineResult } from '../types/contract.types.js';
import { ContractStatus, PartyType, ClauseType } from '@prisma/client';

interface CreateContractInput {
  workspaceId: string;
  title: string;
  fileUrl: string;
  pipelineResult: PipelineResult;
}

export class ContractService {
  /**
   * Persiste o resultado da pipeline de extração no banco de dados.
   * Cria: Contract, ExtractedData, ContractParty[] e ContractClause[]
   * em uma única transação atômica.
   */
  async create(input: CreateContractInput) {
    const { workspaceId, title, fileUrl, pipelineResult } = input;
    const extracted = pipelineResult.extractedData;

    return prisma.$transaction(async (tx) => {
      // 1. Cria o contrato principal
      const contract = await tx.contract.create({
        data: {
          workspace_id: workspaceId,
          title: extracted?.titulo ?? title,
          status: this.mapStatus(extracted?.statusExtracao),
          file_url: fileUrl,
        },
      });

      // 2. Salva os dados estruturados extraídos pela IA
      if (extracted) {
        await tx.extractedData.create({
          data: {
            contract_id: contract.id,
            start_date: this.parseDate(extracted.prazos?.inicio),
            end_date: this.parseDate(extracted.prazos?.termino),
            value: extracted.valor?.total ? parseFloat(extracted.valor.total) : null,
            readjustment_index: extracted.valor?.reajuste,
            auto_renewal:
              extracted.prazos?.renovacao?.toLowerCase().includes('automática') ?? false,
            raw_gemini_json: pipelineResult.rawGeminiResponse
              ? JSON.parse(pipelineResult.rawGeminiResponse)
              : null,
          },
        });

        // 3. Salva as partes do contrato (contratante/contratado)
        const parties: { contract_id: string; name: string; type: PartyType }[] = [];

        if (extracted.partes?.contratante) {
          parties.push({
            contract_id: contract.id,
            name: extracted.partes.contratante,
            type: PartyType.CONTRACTOR,
          });
        }

        if (extracted.partes?.contratado) {
          parties.push({
            contract_id: contract.id,
            name: extracted.partes.contratado,
            type: PartyType.HIRED,
          });
        }

        if (parties.length > 0) {
          await tx.contractParty.createMany({ data: parties });
        }

        // 4. Salva cláusulas relevantes e penalidades
        const clauses: { contract_id: string; type: ClauseType; content: string }[] = [];

        if (extracted.clausulasRelevantes) {
          for (const content of extracted.clausulasRelevantes) {
            clauses.push({
              contract_id: contract.id,
              type: ClauseType.GENERAL,
              content,
            });
          }
        }

        if (extracted.penalidades?.multaInadimplemento) {
          clauses.push({
            contract_id: contract.id,
            type: ClauseType.PENALTY,
            content: `Multa por inadimplemento: ${extracted.penalidades.multaInadimplemento}`,
          });
        }

        if (extracted.penalidades?.multaRescisao) {
          clauses.push({
            contract_id: contract.id,
            type: ClauseType.PENALTY,
            content: `Multa por rescisão: ${extracted.penalidades.multaRescisao}`,
          });
        }

        if (clauses.length > 0) {
          await tx.contractClause.createMany({ data: clauses });
        }
      }

      // Retorna o contrato completo com todas as relações
      return tx.contract.findUniqueOrThrow({
        where: { id: contract.id },
        include: {
          data: true,
          parties: true,
          clauses: true,
        },
      });
    });
  }

  private mapStatus(statusExtracao?: string): ContractStatus {
    switch (statusExtracao) {
      case 'completo':
      case 'parcial':
        return ContractStatus.ACTIVE;
      default:
        return ContractStatus.PROCESSING;
    }
  }

  private parseDate(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
}
