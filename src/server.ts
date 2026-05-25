import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startAlertJob } from './jobs/alert.jobs.js';

const start = async () => {
  try {
    const app = await buildApp();
    startAlertJob();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando na porta ${env.PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();