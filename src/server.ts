import 'dotenv/config';
import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { prisma } from './lib/prisma.js';
import { authRoutes } from './http/routes/auth-routes.js';

const app = fastify({ logger: true });

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'nexusdoc-super-secret-key-123',
});

app.register(authRoutes, { prefix: '/auth' });

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
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log(' Servidor rodando na porta 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();