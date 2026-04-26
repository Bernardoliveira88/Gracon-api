import 'dotenv/config'; 
import fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const app = fastify({ logger: true });

// 1. Passamos a string de conexão para o Adaptador Postgres
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
});

// 2. Passamos o Adaptador para o PrismaClient
const prisma = new PrismaClient({ adapter });

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