import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedContractData } from '../types/contract.types.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `Você é um sistema especializado em análise jurídica de contratos empresariais brasileiros.

SUAS REGRAS ABSOLUTAS:
1. Responda SOMENTE com JSON válido — zero texto fora do JSON
2. Nunca invente informações — se não encontrar, use null
3. Nunca use markdown, blocos de código ou explicações
4. Seja preciso: extraia o que está escrito, não interprete além do texto
5. Em caso de ambiguidade, escolha a interpretação mais conservadora`;

const EXTRACTION_PROMPT = `Analise o contrato e extraia as informações no JSON abaixo.
Siga o schema exatamente — não adicione nem remova campos.

{
  "titulo": "título ou tipo do contrato conforme escrito no documento, ou null",
  "partes": {
    "contratante": "nome completo de quem contrata (geralmente quem paga), ou null",
    "contratado": "nome completo de quem presta o serviço ou fornece, ou null"
  },
  "objeto": "descrição do objeto em 1-3 frases, extraída diretamente do contrato, ou null",
  "prazos": {
    "inicio": "data de início em YYYY-MM-DD se explícita, ou null",
    "termino": "data de término em YYYY-MM-DD se explícita, ou null",
    "vigencia": "duração textual como está no contrato, ex: '12 meses', ou null",
    "prazoRelativo": "se o prazo depende de um evento, descreva, ex: '90 dias após assinatura', ou null",
    "renovacao": "condição de renovação resumida ou null",
    "renovacaoAutomatica": true ou false
  },
  "valor": {
    "total": "valor total como string numérica ex: '84000.00', ou null",
    "moeda": "BRL, USD, EUR etc, ou null",
    "formaPagamento": "descrição objetiva da forma de pagamento, ou null",
    "reajuste": "índice ou condição de reajuste se houver, ex: 'anual pelo IPCA', ou null",
    "dataReajuste": "data do próximo reajuste em YYYY-MM-DD se explícita, ou null"
  },
  "penalidades": {
    "multaInadimplemento": "percentual ou valor de multa por descumprimento, ou null",
    "multaRescisao": "percentual ou valor de multa por rescisão antecipada, ou null",
    "juros": "taxa de juros aplicável, ou null"
  },
  "clausulasRelevantes": ["máximo 6 itens"],
  "alertas": ["máximo 6 itens, ordenados por criticidade"],
  "statusExtracao": "completo | parcial | insuficiente"
}

REGRAS:
- Datas: converta para YYYY-MM-DD apenas quando explícitas
- Datas relativas: NÃO converta — use prazoRelativo
- Valores: apenas números, sem R$ ou símbolos
- Se não for contrato: statusExtracao "insuficiente" e null nos demais campos`;

export interface GeminiExtractedData {
  titulo: string | null;
  partes: { contratante: string | null; contratado: string | null };
  objeto: string | null;
  prazos: {
    inicio: string | null;
    termino: string | null;
    vigencia: string | null;
    prazoRelativo: string | null;
    renovacao: string | null;
    renovacaoAutomatica: boolean;
  };
  valor: {
    total: string | null;
    moeda: string | null;
    formaPagamento: string | null;
    reajuste: string | null;
    dataReajuste: string | null;
  };
  penalidades: {
    multaInadimplemento: string | null;
    multaRescisao: string | null;
    juros: string | null;
  };
  clausulasRelevantes: string[];
  alertas: string[];
  statusExtracao: "completo" | "parcial" | "insuficiente";
}

export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractContractData(
    pdfBase64: string,
    mimeType: string,
  ): Promise<{ extracted: ExtractedContractData; raw: string }> {
    const model = this.client.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: pdfBase64 } },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const raw = result.response.text();

    let extracted: GeminiExtractedData;
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      extracted = JSON.parse(cleaned) as GeminiExtractedData;

      // Valida se o documento era realmente um contrato
      if (extracted.statusExtracao === 'insuficiente') {
        throw new Error(
          'O documento enviado não parece ser um contrato válido.',
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('não parece ser')) {
        throw err;
      }
      throw new Error(
        `Gemini retornou resposta inválida. Resposta bruta: ${raw.slice(0, 200)}`,
      );
    }

    return { extracted, raw };
  }
}
