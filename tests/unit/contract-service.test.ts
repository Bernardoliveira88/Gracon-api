import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractService } from '../../src/services/contract.service.js';
import type { PipelineResult } from '../../src/types/contract.types.js';

// Mock do Prisma
vi.mock('../../src/lib/prisma.js', () => {
  const mockTx = {
    contract: {
      create: vi.fn().mockResolvedValue({ id: 'contract-123' }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'contract-123',
        title: 'Contrato de Teste',
        status: 'ACTIVE',
        data: { id: 'data-123' },
        parties: [],
        clauses: [],
      }),
    },
    extractedData: {
      create: vi.fn().mockResolvedValue({ id: 'data-123' }),
    },
    contractParty: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    contractClause: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx)),
      _mockTx: mockTx, // Expõe para assertions nos testes
    },
  };
});

describe('ContractService', () => {
  const service = new ContractService();

  const mockPipelineResult: PipelineResult = {
    success: true,
    filename: 'contrato.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    extractedData: {
      titulo: 'Contrato de Prestação de Serviços',
      partes: {
        contratante: 'Empresa A',
        contratado: 'Empresa B',
      },
      objeto: 'Prestação de serviços.',
      prazos: {
        inicio: '2026-01-01',
        termino: '2026-12-31',
        vigencia: '12 meses',
        prazoRelativo: null,
        renovacao: 'automática por igual período',
      },
      valor: {
        total: '84000.00',
        moeda: 'BRL',
        formaPagamento: 'Mensal',
        reajuste: 'IPCA',
      },
      penalidades: {
        multaInadimplemento: '10%',
        multaRescisao: '20%',
        juros: '1% ao mês',
      },
      clausulasRelevantes: ['Sigilo por 2 anos.', 'Foro de São Paulo.'],
      alertas: ['Renovação automática.'],
      statusExtracao: 'completo',
    },
    rawGeminiResponse: '{}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar um contrato com dados extraídos', async () => {
    const result = await service.create({
      workspaceId: 'ws-123',
      title: 'contrato.pdf',
      fileUrl: 'contrato.pdf',
      pipelineResult: mockPipelineResult,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('contract-123');
  });

  it('deve chamar createMany para partes do contrato', async () => {
    const { prisma } = await import('../../src/lib/prisma.js');

    await service.create({
      workspaceId: 'ws-123',
      title: 'contrato.pdf',
      fileUrl: 'contrato.pdf',
      pipelineResult: mockPipelineResult,
    });

    const mockTx = (prisma as any)._mockTx;
    expect(mockTx.contractParty.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Empresa A', type: 'CONTRACTOR' }),
        expect.objectContaining({ name: 'Empresa B', type: 'HIRED' }),
      ]),
    });
  });

  it('deve criar cláusulas relevantes e de penalidade', async () => {
    const { prisma } = await import('../../src/lib/prisma.js');

    await service.create({
      workspaceId: 'ws-123',
      title: 'contrato.pdf',
      fileUrl: 'contrato.pdf',
      pipelineResult: mockPipelineResult,
    });

    const mockTx = (prisma as any)._mockTx;
    expect(mockTx.contractClause.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ type: 'GENERAL', content: 'Sigilo por 2 anos.' }),
        expect.objectContaining({ type: 'PENALTY', content: expect.stringContaining('inadimplemento') }),
      ]),
    });
  });

  it('deve mapear status "completo" para ACTIVE', async () => {
    const { prisma } = await import('../../src/lib/prisma.js');

    await service.create({
      workspaceId: 'ws-123',
      title: 'contrato.pdf',
      fileUrl: 'contrato.pdf',
      pipelineResult: mockPipelineResult,
    });

    const mockTx = (prisma as any)._mockTx;
    expect(mockTx.contract.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'ACTIVE' }),
    });
  });
});
