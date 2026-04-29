import { describe, it, expect } from 'vitest';
import { PdfService } from '../../src/services/pdf.service.js';
import type { MultipartFile } from '@fastify/multipart';
import { Readable } from 'stream';

/**
 * Cria um MultipartFile fake para testes.
 */
function createFakeMultipartFile(
  content: Buffer,
  mimetype: string = 'application/pdf',
  filename: string = 'test.pdf',
): MultipartFile {
  const readable = Readable.from(content) as MultipartFile['file'];
  return {
    file: readable,
    filename,
    mimetype,
    encoding: '7bit',
    fieldname: 'file',
    type: 'file',
    fields: {},
    toBuffer: async () => content,
  } as unknown as MultipartFile;
}

// Assinatura mágica de um PDF válido
const PDF_HEADER = Buffer.from('%PDF-1.4 fake content');

describe('PdfService', () => {
  const service = new PdfService();

  it('deve rejeitar arquivos com MIME type inválido', async () => {
    const file = createFakeMultipartFile(PDF_HEADER, 'image/png', 'photo.png');

    await expect(service.readFromMultipart(file)).rejects.toThrow(
      'Tipo de arquivo inválido',
    );
  });

  it('deve rejeitar arquivos vazios', async () => {
    const file = createFakeMultipartFile(Buffer.alloc(0), 'application/pdf');

    await expect(service.readFromMultipart(file)).rejects.toThrow(
      'arquivo enviado está vazio',
    );
  });

  it('deve rejeitar arquivos muito grandes (>20MB)', async () => {
    const bigBuffer = Buffer.alloc(21 * 1024 * 1024, 0);
    // Injeta header PDF no início
    Buffer.from('%PDF-').copy(bigBuffer);
    const file = createFakeMultipartFile(bigBuffer, 'application/pdf');

    await expect(service.readFromMultipart(file)).rejects.toThrow(
      'Arquivo muito grande',
    );
  });

  it('deve rejeitar arquivos sem assinatura PDF válida', async () => {
    const notPdf = Buffer.from('Este não é um PDF');
    const file = createFakeMultipartFile(notPdf, 'application/pdf');

    await expect(service.readFromMultipart(file)).rejects.toThrow(
      'não é um PDF válido',
    );
  });

  it('deve processar um PDF válido e retornar base64', async () => {
    const file = createFakeMultipartFile(PDF_HEADER, 'application/pdf', 'contrato.pdf');

    const result = await service.readFromMultipart(file);

    expect(result.filename).toBe('contrato.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.sizeBytes).toBe(PDF_HEADER.length);
    expect(result.base64).toBe(PDF_HEADER.toString('base64'));
  });
});
