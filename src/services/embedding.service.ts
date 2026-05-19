import { GoogleGenAI } from '@google/genai';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

// Alterado para o modelo estável do novo SDK que mantém as mesmas 768 dimensões do pgvector
const EMBEDDING_MODEL = 'text-multilingual-embedding-002';
const VECTOR_DIMENSIONS = 768;

export class EmbeddingService {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  /**
   * Gera um vetor de embedding para um texto usando o Gemini.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        outputDimensionality: VECTOR_DIMENSIONS,
      },
    });

    const embedding = result.embeddings?.[0]?.values;
    if (!embedding || embedding.length === 0) {
      throw new Error('Gemini não retornou embedding válido.');
    }

    return embedding;
  }

  /**
   * Monta um texto resumo a partir dos dados extraídos do contrato,
   * gera o embedding e salva no banco de dados.
   */
  async generateContractEmbedding(contractId: string): Promise<void> {
    // Busca o contrato com seus dados extraídos, partes e cláusulas
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: {
        data: true,
        parties: true,
        clauses: true,
        tags: true,
      },
    });

    // Monta texto rico para gerar embedding de qualidade
    const parts: string[] = [];

    parts.push(`Título: ${contract.title}`);
    parts.push(`Status: ${contract.status}`);

    if (contract.parties.length > 0) {
      const partiesText = contract.parties
        .map((p: { type: string; name: string }) => `${p.type}: ${p.name}`)
        .join(', ');
      parts.push(`Partes: ${partiesText}`);
    }

    if (contract.data) {
      if (contract.data.start_date) {
        parts.push(`Início: ${contract.data.start_date.toISOString().split('T')[0]}`);
      }
      if (contract.data.end_date) {
        parts.push(`Término: ${contract.data.end_date.toISOString().split('T')[0]}`);
      }
      if (contract.data.value) {
        parts.push(`Valor: R$ ${contract.data.value.toFixed(2)}`);
      }
      if (contract.data.readjustment_index) {
        parts.push(`Reajuste: ${contract.data.readjustment_index}`);
      }
      if (contract.data.raw_gemini_json) {
        // Extrai o campo "objeto" do JSON bruto do Gemini
        const rawJson = contract.data.raw_gemini_json as Record<string, unknown>;
        if (rawJson.objeto) {
          parts.push(`Objeto: ${rawJson.objeto}`);
        }
        // Extrai penalidades
        const penalidades = rawJson.penalidades as Record<string, string> | undefined;
        if (penalidades) {
          if (penalidades.multaInadimplemento) {
            parts.push(`Multa inadimplemento: ${penalidades.multaInadimplemento}`);
          }
          if (penalidades.multaRescisao) {
            parts.push(`Multa rescisão: ${penalidades.multaRescisao}`);
          }
        }
      }
    }

    if (contract.clauses.length > 0) {
      const clausesText = contract.clauses
        .map((c: { type: string; content: string }) => `[${c.type}] ${c.content}`)
        .join('; ');
      parts.push(`Cláusulas: ${clausesText}`);
    }

    if (contract.tags.length > 0) {
      parts.push(`Tags: ${contract.tags.map((t: { tag: string }) => t.tag).join(', ')}`);
    }

    const contentText = parts.join('\n');
    const embedding = await this.generateEmbedding(contentText);
    const vectorStr = `[${embedding.join(',')}]`;

    // Upsert: se já existir embedding para esse contrato, atualiza
    const existing = await prisma.contractEmbedding.findUnique({
      where: { contract_id: contractId },
    });

    if (existing) {
      await prisma.$queryRawUnsafe(
        `UPDATE "contract_embeddings" SET "embedding" = $1::vector, "content_text" = $2 WHERE "contract_id" = $3`,
        vectorStr,
        contentText,
        contractId
      );
    } else {
      const id = crypto.randomUUID();
      await prisma.$queryRawUnsafe(
        `INSERT INTO "contract_embeddings" ("id", "contract_id", "content_text", "embedding", "created_at")
         VALUES ($1, $2, $3, $4::vector, NOW())`,
        id,
        contractId,
        contentText,
        vectorStr
      );
    }
  }

  /**
   * Busca semântica: gera embedding da query e retorna os contratos
   * mais similares dentro do workspace, ordenados por relevância.
   */
  async semanticSearch(
    query: string,
    workspaceId: string,
    limit: number = 10
  ): Promise<
    {
      contract_id: string;
      title: string;
      status: string;
      similarity: number;
      content_text: string;
    }[]
  > {
    const queryEmbedding = await this.generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<
      {
        contract_id: string;
        title: string;
        status: string;
        similarity: number;
        content_text: string;
      }[]
    >(
      `SELECT
         ce."contract_id",
         c."title",
         c."status",
         1 - (ce."embedding" <=> $1::vector) AS similarity,
         ce."content_text"
       FROM "contract_embeddings" ce
       JOIN "contracts" c ON c."id" = ce."contract_id"
       WHERE c."workspace_id" = $2
       ORDER BY ce."embedding" <=> $1::vector ASC
       LIMIT $3`,
      vectorStr,
      workspaceId,
      limit
    );

    return results;
  }
}
