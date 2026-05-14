import 'dotenv/config';
import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { prisma } from './lib/prisma.js';
import { authRoutes } from './http/routes/auth-routes.js';
import { contractRoutes } from './http/routes/contract-routes.js'
import { startAlertJob } from "./jobs/alert.jobs.js";

const app = fastify({ logger: true });

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'nexusdoc-super-secret-key-123',
});

app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024}});
app.register(authRoutes, { prefix: '/auth' });
app.register(contractRoutes, { prefix: "/contracts" });
app.register(contractRoutes).after((err) => {
  if (err) console.error('Erro ao registrar contractRoutes:', err);
});

app.get('/', async (request, reply) => {

  const workspacesCount = await prisma.workspace.count();

  return {
    status: 'NexusDoc API Online 🚀',
    db_connection: 'OK',
    workspaces: workspacesCount
  };
});

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3333, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando na porta ${process.env.PORT || 3333}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startAlertJob();
start();