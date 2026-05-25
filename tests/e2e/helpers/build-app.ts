/**
 * Helper para inicializar a aplicação Fastify em modo de teste,
 * sem chamar listen(). Usa `app.inject()` para enviar requests.
 *
 * IMPORTANTE: Variáveis de ambiente (DATABASE_URL, JWT_SECRET, etc.)
 * são injetadas via vitest.e2e.config.ts. Mocks externos (Gemini,
 * Resend, Supabase, Embedding) devem ser declarados com vi.mock()
 * no topo de cada arquivo de teste, ANTES de chamar buildTestApp().
 */
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/app.js';

let cached: FastifyInstance | null = null;

export async function buildTestApp(): Promise<FastifyInstance> {
  if (cached) return cached;
  const app = await buildApp();
  await app.ready();
  cached = app;
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = null;
  }
}
