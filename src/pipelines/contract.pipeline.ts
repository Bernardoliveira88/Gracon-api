import type { MultipartFile } from "@fastify/multipart";
import { PdfService } from "../services/pdf.service.js";
import { GeminiService } from "../services/gemini.service.js";
import type { PipelineResult } from "../types/contract.types.js";
import { supabase } from "../lib/supabase.js"; // <--- Importa o cliente que criamos no passo anterior

export class ContractPipeline {
  private pdfService: PdfService;
  private geminiService: GeminiService;

  constructor() {
    this.pdfService = new PdfService();
    this.geminiService = new GeminiService();
  }

  async run(file: MultipartFile): Promise<PipelineResult> {
    // Etapa 1 — Leitura e validação do PDF
    const pdf = await this.pdfService.readFromMultipart(file);

    // Etapa intermediária — Upload para o Supabase Storage
    // Convertemos o base64 de volta para um Buffer que o SDK do Supabase aceita nativamente
    const fileBuffer = Buffer.from(pdf.base64, 'base64');
    
    // Geramos um caminho único dentro do bucket para evitar colisões de arquivos com o mesmo nome
    const uniquePath = `contratos/${Date.now()}-${pdf.filename}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('nexusdoc-pdfs') // Seu bucket exato do Supabase
      .upload(uniquePath, fileBuffer, {
        contentType: pdf.mimeType,
        upsert: true,
      });

    if (storageError) {
      throw new Error(`Falha ao salvar o PDF no Supabase Storage: ${storageError.message}`);
    }

    // Etapa 2 — Extração via Gemini
    const { extracted, raw } = await this.geminiService.extractContractData(
      pdf.base64,
      pdf.mimeType
    );

    // Retornamos os dados incluindo a URL/Caminho gerado pelo Storage
    return {
      success: true,
      filename: pdf.filename,
      mimeType: pdf.mimeType,
      sizeBytes: pdf.sizeBytes,
      fileUrl: storageData.path,
      extractedData: extracted,
      rawGeminiResponse: raw,
    };
  }
}
