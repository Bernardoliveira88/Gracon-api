import { prisma } from '../lib/prisma.js';
import type { ExtractedContractData, PipelineResult } from '../types/contract.types.js';
import { ContractStatus, PartyType, ClauseType } from '@prisma/client';
import { EmbeddingService } from './embedding.service.js';

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

    const result = await prisma.$transaction(async (tx) => {
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
            value: this.parseMoney(extracted.valor?.total),
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

      // 5. Salva a versão inicial no histórico
      await tx.contractVersion.create({
        data: {
          contract_id: contract.id,
          file_url: fileUrl,
          version_num: 1,
        },
      });

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

    // Gera embedding de forma assíncrona (não bloqueia o upload)
    try {
      const embeddingService = new EmbeddingService();
      embeddingService.generateContractEmbedding(result.id).catch((err) => {
        console.error(`[Embedding] Falha ao gerar embedding para contrato ${result.id}:`, err);
      });
    } catch (err) {
      console.error('[Embedding] Falha ao inicializar EmbeddingService:', err);
    }

    return result;
  }

  /**
   * Adiciona uma nova versão a um contrato existente.
   * Substitui os dados extraídos, partes e cláusulas, e adiciona
   * um novo registro no histórico de versões.
   */
  async addVersion(contractId: string, input: Omit<CreateContractInput, 'workspaceId'>) {
    const { title, fileUrl, pipelineResult } = input;
    const extracted = pipelineResult.extractedData;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Pega a versão atual para incrementar
      const lastVersion = await tx.contractVersion.findFirst({
        where: { contract_id: contractId },
        orderBy: { version_num: 'desc' },
      });
      const nextVersionNum = (lastVersion?.version_num ?? 0) + 1;

      // 2. Atualiza o contrato principal
      const contract = await tx.contract.update({
        where: { id: contractId },
        data: {
          title: extracted?.titulo ?? title,
          status: this.mapStatus(extracted?.statusExtracao),
          file_url: fileUrl,
        },
      });

      // 3. Deleta os dados de extração antigos (cascade não funciona em replace manual, então removemos explícito)
      await tx.extractedData.deleteMany({ where: { contract_id: contractId } });
      await tx.contractParty.deleteMany({ where: { contract_id: contractId } });
      await tx.contractClause.deleteMany({ where: { contract_id: contractId } });

      // 4. Salva os novos dados estruturados extraídos pela IA
      if (extracted) {
        await tx.extractedData.create({
          data: {
            contract_id: contract.id,
            start_date: this.parseDate(extracted.prazos?.inicio),
            end_date: this.parseDate(extracted.prazos?.termino),
            value: this.parseMoney(extracted.valor?.total),
            readjustment_index: extracted.valor?.reajuste,
            auto_renewal:
              extracted.prazos?.renovacao?.toLowerCase().includes('automática') ?? false,
            raw_gemini_json: pipelineResult.rawGeminiResponse
              ? JSON.parse(pipelineResult.rawGeminiResponse)
              : null,
          },
        });

        // Partes
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

        // Cláusulas
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

      // 5. Adiciona a nova versão no histórico
      await tx.contractVersion.create({
        data: {
          contract_id: contract.id,
          file_url: fileUrl,
          version_num: nextVersionNum,
        },
      });

      // Retorna o contrato atualizado
      return tx.contract.findUniqueOrThrow({
        where: { id: contract.id },
        include: {
          data: true,
          parties: true,
          clauses: true,
          versions: true,
        },
      });
    });

    // Atualiza o embedding
    try {
      const embeddingService = new EmbeddingService();
      embeddingService.generateContractEmbedding(result.id).catch((err) => {
        console.error(`[Embedding] Falha ao atualizar embedding do contrato ${result.id}:`, err);
      });
    } catch (err) {
      console.error('[Embedding] Falha ao inicializar EmbeddingService:', err);
    }

    return result;
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

  /**
   * Converte valores monetários extraídos pelo Gemini para Float.
   * O Gemini devolve formato pt-BR ("R$ 1.234.567,89") — parseFloat puro
   * vira NaN (símbolo no início) ou trunca no separador de milhar ("84.000" → 84).
   */
  private parseMoney(raw?: string | number | null): number | null {
    if (raw == null) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

    let s = raw.replace(/[^\d.,-]/g, '');
    if (!s) return null;

    if (s.includes(',')) {
      // pt-BR: pontos são milhar, vírgula é decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      // Só pontos em grupos de 3 ("84.000", "1.200.000") → milhar pt-BR
      s = s.replace(/\./g, '');
    }

    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
}
