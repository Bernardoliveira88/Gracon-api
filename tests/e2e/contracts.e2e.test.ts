import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';

// ── Mocks de serviços externos ────────────────────────────────────────
// Importante: mocks DEVEM ser declarados antes dos imports do build-app/helpers.

const mockPipelineResult = {
  success: true,
  filename: 'contrato-teste.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  fileUrl: 'contratos/123-contrato-teste.pdf',
  extractedData: {
    titulo: 'Contrato de Prestação de Serviços',
    partes: {
      contratante: 'Empresa Alpha',
      contratado: 'Empresa Beta',
    },
    objeto: 'Serviços de consultoria.',
    prazos: {
      inicio: '2026-01-01',
      termino: '2026-12-31',
      vigencia: '12 meses',
      prazoRelativo: null,
      renovacao: 'automática por igual período',
      renovacaoAutomatica: true,
    },
    valor: {
      total: '120000.00',
      moeda: 'BRL',
      formaPagamento: 'Mensal',
      reajuste: 'IPCA',
      dataReajuste: null,
    },
    penalidades: {
      multaInadimplemento: '10%',
      multaRescisao: '20%',
      juros: '1% ao mês',
    },
    clausulasRelevantes: ['Sigilo por 2 anos.'],
    alertas: ['Renovação automática.'],
    statusExtracao: 'completo' as const,
  },
  rawGeminiResponse: '{}',
};

// Mock do pipeline inteiro (evita PDF parse, Gemini real e Supabase Storage).
vi.mock('../../src/pipelines/contract.pipeline.js', () => ({
  ContractPipeline: class {
    async run() {
      return mockPipelineResult;
    }
  },
}));

// Mock Gemini Service (caso seja importado em outro lugar do fluxo).
vi.mock('../../src/services/gemini.service.js', () => ({
  GeminiService: class {
    async extractContractData() {
      return { extracted: mockPipelineResult.extractedData, raw: '{}' };
    }
  },
}));

// Mock Supabase (verify-jwt etc não usam, mas o module-level throw precisa ser evitado).
vi.mock('../../src/lib/supabase.js', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'mocked/path.pdf' },
          error: null,
        }),
      }),
    },
  },
}));

// Mock Resend (não envia emails reais ao aprovar/rejeitar).
vi.mock('../../src/services/email.service.js', () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock Embedding (evita chamadas ao Gemini embedding).
vi.mock('../../src/services/embedding.service.js', () => ({
  EmbeddingService: class {
    async generateContractEmbedding() {
      return;
    }
    async generateEmbedding() {
      return [];
    }
    async semanticSearch() {
      return [];
    }
  },
}));

import { buildTestApp, closeTestApp } from './helpers/build-app.js';
import {
  truncateAll,
  disconnectPrisma,
  createTestUserAndWorkspace,
} from './helpers/db.js';
import { signTestToken, authHeaders } from './helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';

// Pequeno helper para gerar corpo multipart sem dependências extras.
function buildMultipart(filename: string, content: Buffer) {
  const boundary = '----TestBoundary' + Math.random().toString(16).slice(2);
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, content, tail]);
  return {
    body,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
  };
}

describe('E2E — Contracts routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('Autenticação e autorização', () => {
    it('GET /contracts sem auth retorna 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/contracts',
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /contracts com auth + workspace válido retorna lista vazia (200)', async () => {
      const { userId, workspaceId } = await createTestUserAndWorkspace();
      const token = await signTestToken(app, userId);

      const response = await app.inject({
        method: 'GET',
        url: '/contracts',
        headers: authHeaders(token, workspaceId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.total).toBe(0);
      expect(body.results).toEqual([]);
    });
  });

  describe('POST /contracts/upload', () => {
    it('cria Contract + ExtractedData no banco a partir do pipeline mockado', async () => {
      const { userId, workspaceId } = await createTestUserAndWorkspace();
      const token = await signTestToken(app, userId);

      const fakePdf = Buffer.from('%PDF-1.4 fake pdf content');
      const { body, headers } = buildMultipart('contrato-teste.pdf', fakePdf);

      const response = await app.inject({
        method: 'POST',
        url: '/contracts/upload',
        headers: {
          ...authHeaders(token, workspaceId),
          ...headers,
        },
        payload: body,
      });

      expect(response.statusCode).toBe(201);
      const json = response.json();
      expect(json.ok).toBe(true);
      expect(json.data.contract).toBeDefined();
      expect(json.data.contract.title).toBe('Contrato de Prestação de Serviços');

      // Verifica persistência real
      const contracts = await prisma.contract.findMany({
        where: { workspace_id: workspaceId },
        include: { data: true, parties: true, clauses: true },
      });
      expect(contracts).toHaveLength(1);
      expect(contracts[0].data).not.toBeNull();
      expect(contracts[0].parties.length).toBeGreaterThan(0);
      expect(contracts[0].clauses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /contracts/:id', () => {
    it('retorna detalhe do contrato persistido', async () => {
      const { userId, workspaceId } = await createTestUserAndWorkspace();
      const token = await signTestToken(app, userId);

      // Cria um contrato direto via Prisma (mais rápido que upload).
      const contract = await prisma.contract.create({
        data: {
          workspace_id: workspaceId,
          title: 'Contrato Direto',
          file_url: 'direct/file.pdf',
          status: 'ACTIVE',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/contracts/${contract.id}`,
        headers: authHeaders(token, workspaceId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.contract.id).toBe(contract.id);
      expect(body.data.contract.title).toBe('Contrato Direto');
    });

    it('retorna 404 para id inexistente', async () => {
      const { userId, workspaceId } = await createTestUserAndWorkspace();
      const token = await signTestToken(app, userId);

      const response = await app.inject({
        method: 'GET',
        url: '/contracts/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(token, workspaceId),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /contracts/:id/approve (role LEGAL)', () => {
    it('cria ContractApproval e move status para PENDING_FINANCE', async () => {
      const { userId, workspaceId } = await createTestUserAndWorkspace({
        role: Role.LEGAL,
      });
      const token = await signTestToken(app, userId);

      const contract = await prisma.contract.create({
        data: {
          workspace_id: workspaceId,
          title: 'Contrato Pendente Jurídico',
          file_url: 'legal/file.pdf',
          status: 'PENDING_LEGAL',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contract.id}/approve`,
        headers: authHeaders(token, workspaceId),
        payload: {
          user_id: userId,
          decision: 'APPROVED',
          comment: 'OK pelo jurídico.',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.status).toBe('PENDING_FINANCE');

      const approvals = await prisma.contractApproval.findMany({
        where: { contract_id: contract.id },
      });
      expect(approvals).toHaveLength(1);
      expect(approvals[0].step).toBe('LEGAL');
      expect(approvals[0].decision).toBe('APPROVED');

      const updated = await prisma.contract.findUnique({
        where: { id: contract.id },
      });
      expect(updated?.status).toBe('PENDING_FINANCE');
    });
  });
});
