import type { MultipartFile } from '@fastify/multipart';
import { AppError } from '../errors/app-error.js';

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = ['application/pdf'];
// Magic bytes do PDF: %PDF (0x25 0x50 0x44 0x46)
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export interface PdfReadResult {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
}

export class PdfService {
  async readFromMultipart(file: MultipartFile): Promise<PdfReadResult> {
    // Valida MIME type ANTES de consumir o stream (evita ler arquivos inválidos)
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      // Drena o stream para evitar leak de memória
      file.file.resume();
      throw new AppError(
        `Tipo de arquivo inválido: "${file.mimetype}". Apenas PDF é aceito.`,
        400,
      );
    }

    const chunks: Buffer[] = [];

    for await (const chunk of file.file) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      throw new AppError('O arquivo enviado está vazio.', 400);
    }

    if (buffer.length > MAX_SIZE_BYTES) {
      const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);
      throw new AppError(
        `Arquivo muito grande (${sizeMb} MB). Limite: 25 MB.`,
        413,
      );
    }

    // Valida magic bytes do PDF: primeiros 4 bytes devem ser "%PDF"
    if (
      buffer.length < 4 ||
      !buffer.subarray(0, 4).equals(PDF_MAGIC_BYTES)
    ) {
      throw new AppError(
        'O arquivo não é um PDF válido (assinatura inválida).',
        400,
      );
    }

    return {
      filename: file.filename,
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
      base64: buffer.toString('base64'),
    };
  }
}
