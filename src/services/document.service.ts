import type { MultipartFile } from '@fastify/multipart';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export interface SavedDocument {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string; // relative to project root
}

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'documents');

function sanitizeFilename(name: string): string {
  // remove path separators and control chars
  return name.replace(/[\\/\x00-\x1f]/g, '_').slice(0, 200) || 'file';
}

export class DocumentService {
  async saveFromMultipart(file: MultipartFile, workspaceId: string): Promise<SavedDocument> {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      file.file.resume();
      throw new Error(
        `Tipo de arquivo inválido: "${file.mimetype}". Aceitos: PDF, imagens (PNG/JPG/WEBP/GIF) e DOC/DOCX.`,
      );
    }

    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of file.file) {
      total += chunk.length;
      if (total > MAX_SIZE_BYTES) {
        file.file.resume();
        throw new Error('Arquivo muito grande. Limite: 25 MB.');
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) {
      throw new Error('O arquivo enviado está vazio.');
    }

    const safeName = sanitizeFilename(file.filename);
    const id = randomUUID();
    const dir = path.join(UPLOADS_ROOT, workspaceId);
    await fs.mkdir(dir, { recursive: true });
    const absPath = path.join(dir, `${id}-${safeName}`);
    await fs.writeFile(absPath, buffer);

    const relPath = path.relative(process.cwd(), absPath).split(path.sep).join('/');

    return {
      filename: `${id}-${safeName}`,
      originalName: safeName,
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
      filePath: relPath,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    const abs = path.resolve(process.cwd(), filePath);
    // Defense: ensure file stays inside uploads dir
    if (!abs.startsWith(UPLOADS_ROOT)) {
      throw new Error('Caminho de arquivo inválido.');
    }
    try {
      await fs.unlink(abs);
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') throw err;
    }
  }

  resolveAbsolute(filePath: string): string {
    const abs = path.resolve(process.cwd(), filePath);
    if (!abs.startsWith(UPLOADS_ROOT)) {
      throw new Error('Caminho de arquivo inválido.');
    }
    return abs;
  }

  createReadStream(filePath: string) {
    return createReadStream(this.resolveAbsolute(filePath));
  }
}
