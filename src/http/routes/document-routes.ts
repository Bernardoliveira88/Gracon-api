import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyWorkspaceMember } from '../middlewares/verify-workspace-member.js';
import { uploadDocument } from '../controllers/documents/upload-document.js';
import {
  listDocuments,
  listWorkspaceDocuments,
} from '../controllers/documents/list-documents.js';
import { downloadDocument } from '../controllers/documents/download-document.js';
import { deleteDocument } from '../controllers/documents/delete-document.js';

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT);
  app.addHook('onRequest', verifyWorkspaceMember);

  app.post(
    '/contracts/:contractId/documents',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Upload de um documento (anexo) vinculado a um contrato',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    uploadDocument,
  );

  app.get(
    '/contracts/:contractId/documents',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Listar documentos vinculados a um contrato',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    listDocuments,
  );

  app.get(
    '/documents',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Listar todos os documentos do workspace',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
      },
    },
    listWorkspaceDocuments,
  );

  app.get(
    '/documents/:id/download',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Baixar arquivo de um documento',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    downloadDocument,
  );

  app.delete(
    '/documents/:id',
    {
      schema: {
        tags: ['Documents'],
        summary: 'Deletar um documento',
        security: [{ bearerAuth: [] }, { workspaceId: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    deleteDocument,
  );
}
