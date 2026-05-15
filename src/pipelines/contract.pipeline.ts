import type { MultipartFile } from "@fastify/multipart";
import { PdfService } from "../services/pdf.service.js";
import { GeminiService } from "../services/gemini.service.js";
import type { PipelineResult } from "../types/contract.types.js";

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

    // Etapa 2 — Extração via Gemini
    const { extracted, raw } = await this.geminiService.extractContractData(
      pdf.base64,
      pdf.mimeType
    );

    return {
      success: true,
      filename: pdf.filename,
      mimeType: pdf.mimeType,
      sizeBytes: pdf.sizeBytes,
      extractedData: extracted,
      rawGeminiResponse: raw,
    };
  }
}
