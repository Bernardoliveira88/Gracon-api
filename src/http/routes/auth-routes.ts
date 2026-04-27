import type { FastifyInstance } from 'fastify';
import { register } from '../controllers/auth/register.js';
import { login } from '../controllers/auth/login.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', register);
  app.post('/login', login);
}
