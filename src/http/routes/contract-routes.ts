import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { uploadContract } from '../controllers/contracts/upload.js';
import { decideApproval } from '../controllers/contracts/decide-approval.js';
import { semanticSearch } from '../controllers/contracts/semantic-search.js';
import { listContracts } from '../controllers/contracts/list-contracts.js';
import { uploadContractVersion } from '../controllers/contracts/upload-version.js';
import { listContractVersions } from '../controllers/contracts/list-versions.js';
import { exportReport } from '../controllers/contracts/export-report.js';
import { getContract } from '../controllers/contracts/get-contract.js';

export async function contractRoutes(app: FastifyInstance) {
  // Todas as rotas de contrato precisam de autenticação + membro do workspace
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  app.post(
    '/contracts/upload',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Upload e análise inicial de um contrato',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  contract: { type: 'object', additionalProperties: true },
                  extraction: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
    },
    uploadContract
  );

  app.get(
    '/contracts',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Listar todos os contratos do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    contract_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    status: { type: 'string' },
                    file_url: { type: 'string' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    listContracts
  );

  app.get(
    '/contracts/search',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Busca semântica no conteúdo dos contratos',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              query: { type: 'string' },
              total: { type: 'number' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    contract_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    status: { type: 'string' },
                    similarity: { type: 'number' },
                    snippet: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    semanticSearch
  );

  app.post(
    '/contracts/:id/approve',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Registrar decisão de aprovação (Jurídico/Financeiro)',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['user_id', 'decision'],
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
            comment: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    decideApproval
  );

  app.post(
    '/contracts/:id/versions',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Upload de uma nova versão do contrato',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  contract: { type: 'object', additionalProperties: true },
                  extraction: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
    },
    uploadContractVersion
  );

  app.get(
    '/contracts/:id/versions',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Listar o histórico de versões do contrato',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    contract_id: { type: 'string', format: 'uuid' },
                    file_url: { type: 'string' },
                    version_num: { type: 'number' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    listContractVersions
  );

app.get(
    '/contracts/:id',
    {
      schema: {
        tags: ['Contracts'],
        summary: 'Detalhes completos de um contrato',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    getContract
  );

  // Relatórios
  app.get('/contracts/report', exportReport);
}
