import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractPipeline } from '../../src/pipelines/contract.pipeline.js';
import type { MultipartFile } from '@fastify/multipart';
import { Readable } from 'stream';

// Mocks com class syntax (necessário para `new`)
vi.mock('../../src/services/pdf.service.js', () => ({
  PdfService: class {
    async readFromMultipart() {
      return {
        filename: 'contrato.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        base64: 'base64content',
      };
    }
  },
}));

vi.mock('../../src/services/gemini.service.js', () => ({
  GeminiService: class {
    async extractContractData() {
      return {
        extracted: {
          titulo: 'Contrato Teste',
          statusExtracao: 'completo',
          partes: { contratante: 'A', contratado: 'B' },
          objeto: 'Serviço X',
          prazos: { inicio: null, termino: null, vigencia: null, prazoRelativo: null, renovacao: null },
          valor: { total: null, moeda: null, formaPagamento: null, reajuste: null },
          penalidades: { multaInadimplemento: null, multaRescisao: null, juros: null },
          clausulasRelevantes: [],
          alertas: [],
        },
        raw: '{}',
      };
    }
  },
}));

function createFakeFile(): MultipartFile {
  return {
    file: Readable.from(Buffer.from('%PDF-1.4')),
    filename: 'contrato.pdf',
    mimetype: 'application/pdf',
    encoding: '7bit',
    fieldname: 'file',
    type: 'file',
    fields: {},
    toBuffer: async () => Buffer.from('%PDF-1.4'),
  } as unknown as MultipartFile;
}

describe('ContractPipeline', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
  });

  it('deve executar o pipeline completo e retornar resultado', async () => {
    const pipeline = new ContractPipeline();
    const result = await pipeline.run(createFakeFile());

    expect(result.success).toBe(true);
    expect(result.filename).toBe('contrato.pdf');
    expect(result.extractedData?.titulo).toBe('Contrato Teste');
  });

  it('deve retornar os metadados do arquivo', async () => {
    const pipeline = new ContractPipeline();
    const result = await pipeline.run(createFakeFile());

    expect(result.mimeType).toBe('application/pdf');
    expect(result.sizeBytes).toBe(1024);
  });
});
