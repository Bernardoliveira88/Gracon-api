import type { MultipartFile } from '@fastify/multipart';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = ['application/pdf'];

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
      throw new Error(
        `Tipo de arquivo inválido: "${file.mimetype}". Apenas PDF é aceito.`,
      );
    }

    const chunks: Buffer[] = [];

    for await (const chunk of file.file) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      throw new Error('O arquivo enviado está vazio.');
    }

    if (buffer.length > MAX_SIZE_BYTES) {
      const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);
      throw new Error(
        `Arquivo muito grande (${sizeMb} MB). Limite: 20 MB.`,
      );
    }

    // Valida assinatura mágica do PDF (%PDF-)
    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw new Error(
        'O arquivo não é um PDF válido (assinatura inválida).',
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
