import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedContractData } from "../types/contract.types.js";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `Você é um especialista em análise jurídica de contratos empresariais.
Sua tarefa é extrair informações estruturadas de contratos em PDF.
Responda APENAS com um objeto JSON válido, sem markdown, sem explicações, sem blocos de código.
Siga exatamente o schema fornecido pelo usuário.`;

const EXTRACTION_PROMPT = `Analise este contrato e extraia as informações no seguinte formato JSON:

{
  "titulo": "título ou tipo do contrato",
  "partes": {
    "contratante": "nome completo do contratante (quem contrata)",
    "contratado": "nome completo do contratado (quem presta o serviço/fornece)"
  },
  "objeto": "descrição resumida do objeto do contrato em 1-2 frases",
  "prazos": {
    "inicio": "data de início no formato YYYY-MM-DD ou null",
    "termino": "data de término no formato YYYY-MM-DD ou null",
    "vigencia": "duração textual ex: '12 meses' ou null",
    "renovacao": "condições de renovação resumidas ou null"
  },
  "valor": {
    "total": "valor total como string ex: '50000.00' ou null",
    "moeda": "BRL, USD etc ou null",
    "formaPagamento": "descrição da forma de pagamento ou null"
  },
  "clausulasRelevantes": [
    "lista de cláusulas importantes resumidas em 1 frase cada"
  ],
  "alertas": [
    "alertas sobre prazos críticos, penalidades, cláusulas de atenção"
  ]
}

Regras:
- Use null para campos não encontrados no documento
- Datas sempre em YYYY-MM-DD quando identificáveis
- clausulasRelevantes e alertas: máximo 5 itens cada
- Responda SOMENTE o JSON, sem nenhum texto adicional`;

export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada.");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractContractData(
    pdfBase64: string,
    mimeType: string
  ): Promise<{ extracted: ExtractedContractData; raw: string }> {
    const model = this.client.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: pdfBase64,
              },
            },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,      // baixo para respostas consistentes
        responseMimeType: "application/json",
      },
    });

    const raw = result.response.text();

    let extracted: ExtractedContractData;
    try {
      // Remove possível wrapper de markdown caso o modelo ignore a instrução
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      extracted = JSON.parse(cleaned) as ExtractedContractData;
    } catch {
      throw new Error(
        `Gemini retornou resposta não-JSON. Resposta bruta: ${raw.slice(0, 200)}`
      );
    }

    return { extracted, raw };
  }
}
