import { describe, it, expect } from 'vitest';
import type { ExtractedContractData } from '../../src/types/contract.types.js';

describe('Contract Types', () => {
  it('deve aceitar um ExtractedContractData válido com todos os campos', () => {
    const data: ExtractedContractData = {
      titulo: 'Contrato de Locação',
      partes: {
        contratante: 'João Silva',
        contratado: 'Maria Santos',
      },
      objeto: 'Locação de imóvel residencial.',
      prazos: {
        inicio: '2026-01-01',
        termino: '2026-12-31',
        vigencia: '12 meses',
        prazoRelativo: null,
        renovacao: null,
      },
      valor: {
        total: '24000.00',
        moeda: 'BRL',
        formaPagamento: 'Mensal',
        reajuste: 'IGPM',
      },
      penalidades: {
        multaInadimplemento: '10%',
        multaRescisao: null,
        juros: '1% ao mês',
      },
      clausulasRelevantes: ['Cláusula de sigilo.'],
      alertas: ['Vencimento em 30 dias.'],
      statusExtracao: 'completo',
    };

    expect(data.titulo).toBe('Contrato de Locação');
    expect(data.statusExtracao).toBe('completo');
    expect(data.prazos.prazoRelativo).toBeNull();
  });

  it('deve aceitar campos nulos (dados não encontrados)', () => {
    const data: ExtractedContractData = {
      titulo: null,
      partes: { contratante: null, contratado: null },
      objeto: null,
      prazos: {
        inicio: null,
        termino: null,
        vigencia: null,
        prazoRelativo: null,
        renovacao: null,
      },
      valor: { total: null, moeda: null, formaPagamento: null, reajuste: null },
      penalidades: { multaInadimplemento: null, multaRescisao: null, juros: null },
      clausulasRelevantes: [],
      alertas: [],
      statusExtracao: 'insuficiente',
    };

    expect(data.titulo).toBeNull();
    expect(data.statusExtracao).toBe('insuficiente');
  });
});
