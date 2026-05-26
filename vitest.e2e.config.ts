import { defineConfig } from 'vitest/config';

/**
 * Configuração específica para a suíte E2E.
 *
 * REQUER:
 *  - PostgreSQL rodando em DATABASE_URL (banco isolado, NUNCA produção).
 *  - Schema aplicado: `npx prisma migrate deploy` antes da primeira execução.
 *
 * Mocks externos (Gemini real, Resend, Supabase Storage, Embedding) são
 * declarados via vi.mock() dentro de cada arquivo .e2e.test.ts.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.test.ts'],
    // E2E precisa rodar serial para evitar conflitos no TRUNCATE entre suites.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://postgres:rootpassword@localhost:5432/nexusdoc_test?schema=public',
      JWT_SECRET:
        process.env.JWT_SECRET ?? 'test-secret-with-at-least-32-characters',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'test-api-key',
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? 'test-resend-key',
      SUPABASE_URL: process.env.SUPABASE_URL ?? 'http://localhost:54321',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? 'test-supabase-key',
      NODE_ENV: 'test',
    },
  },
});
