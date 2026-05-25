import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória.'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres.'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY é obrigatória.'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY é obrigatória para envio de e-mails.'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
