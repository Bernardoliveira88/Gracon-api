/**
 * Utilitários de banco de dados para testes E2E.
 *
 * PRÉ-REQUISITOS:
 * 1. Variável `DATABASE_URL` aponta para um banco PostgreSQL ISOLADO
 *    (ex.: `nexusdoc_test`). NUNCA aponte para produção.
 * 2. Antes da primeira execução, rode:
 *      DATABASE_URL=... npx prisma migrate deploy
 *    para criar o schema.
 *
 * ESTRATÉGIA: Em vez de transações com rollback (que não funcionam bem
 * em testes E2E que envolvem múltiplas conexões via Fastify+Prisma),
 * usamos TRUNCATE CASCADE em todas as tabelas relevantes entre testes.
 */
import { prisma } from '../../../src/lib/prisma.js';
import { hash } from 'bcryptjs';
import { Role, WorkspacePlan } from '@prisma/client';

const TABLES = [
  'contract_approvals',
  'alerts',
  'timeline_events',
  'contract_tags',
  'contract_notes',
  'contract_versions',
  'contract_clauses',
  'contract_parties',
  'extracted_data',
  'contracts',
  'alert_configs',
  'invites',
  'workspace_users',
  'workspaces',
  'users',
];

export async function truncateAll(): Promise<void> {
  // TRUNCATE em uma única instrução para respeitar FK + restart de sequences
  const sql = `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(sql);
}

export interface TestUserAndWorkspace {
  userId: string;
  email: string;
  workspaceId: string;
  password: string;
}

export async function createTestUserAndWorkspace(
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    workspaceName: string;
    role: Role;
  }> = {},
): Promise<TestUserAndWorkspace> {
  const name = overrides.name ?? 'Tester';
  const email = overrides.email ?? `tester+${Date.now()}@nexusdoc.test`;
  const password = overrides.password ?? 'password-123';
  const workspaceName = overrides.workspaceName ?? 'Test Workspace';
  const role = overrides.role ?? Role.ADMIN;

  const password_hash = await hash(password, 6);

  const user = await prisma.user.create({
    data: { name, email, password_hash },
  });

  const workspace = await prisma.workspace.create({
    data: { name: workspaceName, plan: WorkspacePlan.FREE },
  });

  await prisma.workspaceUser.create({
    data: { user_id: user.id, workspace_id: workspace.id, role },
  });

  return { userId: user.id, email, workspaceId: workspace.id, password };
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
