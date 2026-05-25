import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from '../../src/services/gemini.service.js';
import type { ExtractedContractData } from '../../src/types/contract.types.js';

const VALID_RESPONSE: ExtractedContractData = {
  titulo: 'Contrato de Prestação de Serviços',
  partes: {
    contratante: 'Empresa A Ltda',
    contratado: 'Empresa B S.A.',
  },
  objeto: 'Prestação de serviços de consultoria em TI.',
  prazos: {
    inicio: '2026-01-01',
    termino: '2026-12-31',
    vigencia: '12 meses',
    prazoRelativo: null,
    renovacao: 'automática por igual período',
    renovacaoAutomatica: true,
  },
  valor: {
    total: '84000.00',
    moeda: 'BRL',
    formaPagamento: 'Mensal, até o dia 10',
    reajuste: 'anual pelo IPCA',
    dataReajuste: null,
  },
  penalidades: {
    multaInadimplemento: '10%',
    multaRescisao: '20%',
    juros: '1% ao mês',
  },
  clausulasRelevantes: [
    'Sigilo de informações por 2 anos após o término.',
    'Foro da comarca de São Paulo.',
  ],
  alertas: [
    'Renovação automática — avisar 30 dias antes para cancelar.',
  ],
  statusExtracao: 'completo',
};

// Mock generateContent como variável acessível
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar instância da GeminiService', () => {
    const service = new GeminiService();
    expect(service).toBeDefined();
  });

  it('deve fazer parse correto de resposta JSON do Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(VALID_RESPONSE),
    });

    const service = new GeminiService();
    const result = await service.extractContractData('base64pdf', 'application/pdf');

    expect(result.extracted.titulo).toBe('Contrato de Prestação de Serviços');
    expect(result.extracted.partes.contratante).toBe('Empresa A Ltda');
    expect(result.extracted.statusExtracao).toBe('completo');
  });

  it('deve lançar erro se o documento não for um contrato', async () => {
    const insufficientResponse = { ...VALID_RESPONSE, statusExtracao: 'insuficiente' };
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(insufficientResponse),
    });

    const service = new GeminiService();

    await expect(
      service.extractContractData('base64pdf', 'application/pdf'),
    ).rejects.toThrow('não parece ser um contrato');
  });

  it('deve lançar erro se o Gemini retornar JSON inválido', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'isso não é JSON',
    });

    const service = new GeminiService();

    await expect(
      service.extractContractData('base64pdf', 'application/pdf'),
    ).rejects.toThrow('Gemini retornou resposta inválida');
  });
});
