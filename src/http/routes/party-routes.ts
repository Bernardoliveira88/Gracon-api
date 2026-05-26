import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { verifyUserRoles } from '../middlewares/verify-user-roles.js';
import { listParties } from '../controllers/parties/list-parties.js';
import { getParty } from '../controllers/parties/get-party.js';
import { createParty } from '../controllers/parties/create-party.js';
import { updateParty } from '../controllers/parties/update-party.js';
import { deleteParty } from '../controllers/parties/delete-party.js';

const PARTY_KINDS = ['CLIENT', 'SUPPLIER', 'PARTNER', 'INTERNAL'];
const PARTY_STATUSES = ['ACTIVE', 'INACTIVE'];

const partyResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspace_id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    cnpj: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    contact: { type: ['string', 'null'] },
    kind: { type: 'string', enum: PARTY_KINDS },
    status: { type: 'string', enum: PARTY_STATUSES },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
};

export async function partyRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  app.get(
    '/parties',
    {
      schema: {
        tags: ['Parties'],
        summary: 'Listar partes (clientes, fornecedores, parceiros) do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
            kind: { type: 'string', enum: PARTY_KINDS },
            status: { type: 'string', enum: PARTY_STATUSES },
            q: { type: 'string' },
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
              results: { type: 'array', items: partyResponseSchema },
            },
          },
        },
      },
    },
    listParties
  );

  app.get(
    '/parties/:id',
    {
      schema: {
        tags: ['Parties'],
        summary: 'Obter detalhe de uma parte',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: partyResponseSchema,
            },
          },
        },
      },
    },
    getParty
  );

  app.post(
    '/parties',
    {
      preHandler: [verifyUserRoles([Role.LEGAL])],
      schema: {
        tags: ['Parties'],
        summary: 'Criar uma nova parte',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        body: {
          type: 'object',
          required: ['name', 'kind'],
          properties: {
            name: { type: 'string' },
            cnpj: { type: ['string', 'null'] },
            email: { type: ['string', 'null'], format: 'email' },
            contact: { type: ['string', 'null'] },
            kind: { type: 'string', enum: PARTY_KINDS },
            status: { type: 'string', enum: PARTY_STATUSES },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: { ok: { type: 'boolean' }, data: partyResponseSchema },
          },
        },
      },
    },
    createParty
  );

  app.patch(
    '/parties/:id',
    {
      preHandler: [verifyUserRoles([Role.LEGAL])],
      schema: {
        tags: ['Parties'],
        summary: 'Atualizar uma parte',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            cnpj: { type: ['string', 'null'] },
            email: { type: ['string', 'null'], format: 'email' },
            contact: { type: ['string', 'null'] },
            kind: { type: 'string', enum: PARTY_KINDS },
            status: { type: 'string', enum: PARTY_STATUSES },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { ok: { type: 'boolean' }, data: partyResponseSchema },
          },
        },
      },
    },
    updateParty
  );

  app.delete(
    '/parties/:id',
    {
      preHandler: [verifyUserRoles([Role.LEGAL])],
      schema: {
        tags: ['Parties'],
        summary: 'Excluir uma parte',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    deleteParty
  );
}
