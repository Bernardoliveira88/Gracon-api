import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://postgres:rootpassword@localhost:5432/nexusdoc_test?schema=public',
      JWT_SECRET: 'test-secret-with-at-least-32-characters',
      GEMINI_API_KEY: 'test-api-key',
      RESEND_API_KEY: 'test-resend-key'
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/config/**'],
    },
  },
});
