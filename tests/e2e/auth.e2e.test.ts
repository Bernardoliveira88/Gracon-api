import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Mocks de serviços externos — devem vir antes do buildTestApp.
vi.mock('../../src/lib/supabase.js', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'mocked/path.pdf' },
          error: null,
        }),
      }),
    },
  },
}));

vi.mock('../../src/services/gemini.service.js', () => ({
  GeminiService: class {
    async extractContractData() {
      return { extracted: {}, raw: '{}' };
    }
  },
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/embedding.service.js', () => ({
  EmbeddingService: class {
    async generateContractEmbedding() {
      return;
    }
    async generateEmbedding() {
      return [];
    }
    async semanticSearch() {
      return [];
    }
  },
}));

import { buildTestApp, closeTestApp } from './helpers/build-app.js';
import { truncateAll, disconnectPrisma } from './helpers/db.js';

describe('E2E — Auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('POST /auth/register', () => {
    it('cria user + workspace e retorna 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name: 'Alice',
          email: 'alice@example.com',
          password: 'super-secret-123',
          workspace_name: 'Alice Co',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.message).toContain('sucesso');
      expect(body.userId).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.workspaceId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('retorna 409 quando o e-mail já está em uso', async () => {
      const payload = {
        name: 'Bob',
        email: 'bob@example.com',
        password: 'super-secret-123',
        workspace_name: 'Bob Co',
      };

      const first = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload,
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload,
      });
      expect(second.statusCode).toBe(409);
      expect(second.json().message).toMatch(/já está em uso/i);
    });
  });

  describe('POST /auth/login', () => {
    const credentials = {
      name: 'Carol',
      email: 'carol@example.com',
      password: 'super-secret-123',
      workspace_name: 'Carol Co',
    };

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: credentials,
      });
    });

    it('retorna 200 + token + user para credenciais válidas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: credentials.email,
          password: credentials.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(typeof body.token).toBe('string');
      expect(body.token.split('.')).toHaveLength(3); // JWT shape
      expect(body.user.email).toBe(credentials.email);
      expect(body.user.name).toBe(credentials.name);
      expect(Array.isArray(body.user.workspaces)).toBe(true);
      expect(body.user.workspaces).toHaveLength(1);
      expect(body.user.workspaces[0].role).toBe('ADMIN');
    });

    it('retorna 400 quando a senha está errada (credenciais inválidas)', async () => {
      // OBS: o controller atual responde 400 para credenciais inválidas (não 401);
      // o teste reflete o comportamento real.
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: credentials.email,
          password: 'wrong-password-xx',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toMatch(/inválid/i);
    });

    it('retorna 400 quando o usuário não existe', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'ghost@example.com',
          password: 'super-secret-123',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
