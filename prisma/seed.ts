import 'dotenv/config';
import { ContractStatus, EventType, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

import { prisma } from '../src/lib/prisma.js';

const contracts = [
  {
    title: 'Contrato de Desenvolvimento de Software — NexusDoc',
    status: ContractStatus.ACTIVE,
    contratante: 'NexusTech Soluções Empresariais Ltda.',
    contratado: 'DevSoft Sistemas e Consultoria S.A.',
    value: 84000,
    start: new Date('2026-05-01'),
    end: new Date('2027-04-30'),
    auto_renewal: true,
    readjustment_index: 'IPCA anual',
  },
  {
    title: 'Contrato de Licenciamento de Software ERP',
    status: ContractStatus.PENDING_LEGAL,
    contratante: 'Grupo Meridional S.A.',
    contratado: 'SAP Brasil Ltda.',
    value: 240000,
    start: new Date('2026-03-01'),
    end: new Date('2029-02-28'),
    auto_renewal: false,
    readjustment_index: 'IGP-M anual',
  },
  {
    title: 'Contrato de Prestação de Serviços de TI',
    status: ContractStatus.EXPIRING,
    contratante: 'Construtora Horizonte Ltda.',
    contratado: 'TechSupport Brasil S.A.',
    value: 36000,
    start: new Date('2025-06-01'),
    end: new Date('2026-05-31'),
    auto_renewal: true,
    readjustment_index: null,
  },
  {
    title: 'Contrato de Fornecimento de Equipamentos',
    status: ContractStatus.ACTIVE,
    contratante: 'Rede Hospitalar São Lucas S.A.',
    contratado: 'Philips Medical Systems Ltda.',
    value: 520000,
    start: new Date('2026-01-15'),
    end: new Date('2028-01-14'),
    auto_renewal: false,
    readjustment_index: 'IPCA anual',
  },
  {
    title: 'Contrato de Consultoria Jurídica',
    status: ContractStatus.ACTIVE,
    contratante: 'Agro Cerrado Exportações Ltda.',
    contratado: 'Machado Meyer Advogados',
    value: 18000,
    start: new Date('2026-02-01'),
    end: new Date('2027-01-31'),
    auto_renewal: true,
    readjustment_index: 'IPCA anual',
  },
  {
    title: 'Contrato de Locação de Imóvel Comercial',
    status: ContractStatus.ACTIVE,
    contratante: 'Varejo Express Comércio S.A.',
    contratado: 'Imobiliária Central Ltda.',
    value: 72000,
    start: new Date('2025-09-01'),
    end: new Date('2028-08-31'),
    auto_renewal: false,
    readjustment_index: 'IGP-M anual',
  },
  {
    title: 'Contrato de Serviços de Segurança Patrimonial',
    status: ContractStatus.IN_REVIEW,
    contratante: 'Shopping Metrópolis S.A.',
    contratado: 'Vigor Segurança Ltda.',
    value: 96000,
    start: new Date('2026-04-01'),
    end: new Date('2027-03-31'),
    auto_renewal: true,
    readjustment_index: null,
  },
  {
    title: 'Contrato de Publicidade e Marketing Digital',
    status: ContractStatus.PENDING_FINANCE,
    contratante: 'Banco Nacional de Crédito S.A.',
    contratado: 'Agência Criativa Ímpar Ltda.',
    value: 150000,
    start: new Date('2026-05-01'),
    end: new Date('2027-04-30'),
    auto_renewal: false,
    readjustment_index: 'IPCA anual',
  },
  {
    title: 'Contrato de Manutenção de Infraestrutura',
    status: ContractStatus.EXPIRED,
    contratante: 'Distribuidora Paulista de Energia S.A.',
    contratado: 'Engtech Manutenção Industrial Ltda.',
    value: 48000,
    start: new Date('2024-06-01'),
    end: new Date('2025-05-31'),
    auto_renewal: false,
    readjustment_index: null,
  },
  {
    title: 'Contrato de Fornecimento de Matéria-Prima',
    status: ContractStatus.ACTIVE,
    contratante: 'Fábrica Têxtil Aurora S.A.',
    contratado: 'Algodão do Cerrado Ltda.',
    value: 380000,
    start: new Date('2026-01-01'),
    end: new Date('2026-12-31'),
    auto_renewal: true,
    readjustment_index: 'IGPM mensal',
  },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // Cria workspace
  const workspace = await prisma.workspace.create({
    data: { name: 'NexusTech Workspace', plan: 'PRO' },
  });

  // Cria usuários
  const adminHash = await hash('senha123456', 8);

  const admin = await prisma.user.create({
    data: {
      name: 'Daniel Admin',
      email: 'admin@nexusdoc.com',
      password_hash: adminHash,
      workspaces: { create: { workspace_id: workspace.id, role: Role.ADMIN } },
    },
  });

  const legal = await prisma.user.create({
    data: {
      name: 'Ana Jurídico',
      email: 'juridico@nexusdoc.com',
      password_hash: adminHash,
      workspaces: { create: { workspace_id: workspace.id, role: Role.LEGAL } },
    },
  });

  const finance = await prisma.user.create({
    data: {
      name: 'Carlos Financeiro',
      email: 'financeiro@nexusdoc.com',
      password_hash: adminHash,
      workspaces: { create: { workspace_id: workspace.id, role: Role.FINANCE } },
    },
  });

  // Cria contratos
  for (const c of contracts) {
    const contract = await prisma.contract.create({
      data: {
        workspace_id: workspace.id,
        title: c.title,
        status: c.status,
        file_url: `https://storage.nexusdoc.com/contracts/${c.title.toLowerCase().replace(/ /g, '-')}.pdf`,
        data: {
          create: {
            start_date: c.start,
            end_date: c.end,
            value: c.value,
            auto_renewal: c.auto_renewal,
            readjustment_index: c.readjustment_index,
          },
        },
        parties: {
          createMany: {
            data: [
              { name: c.contratante, type: 'CONTRACTOR' },
              { name: c.contratado, type: 'HIRED' },
            ],
          },
        },
      },
    });

    // Timeline events
    await prisma.timelineEvent.createMany({
      data: [
        {
          contract_id: contract.id,
          type: EventType.EXPIRATION,
          scheduled_for: c.end,
          description: `Vencimento do contrato em ${c.end.toLocaleDateString('pt-BR')}.`,
        },
        {
          contract_id: contract.id,
          type: EventType.RENEWAL,
          scheduled_for: new Date(c.end.getTime() - 30 * 24 * 60 * 60 * 1000),
          description: `Alerta: contrato vence em 30 dias.`,
        },
        ...(c.readjustment_index ? [{
          contract_id: contract.id,
          type: EventType.PAYMENT,
          scheduled_for: new Date(c.start.getTime() + 365 * 24 * 60 * 60 * 1000),
          description: `Reajuste previsto: ${c.readjustment_index}.`,
        }] : []),
      ],
    });
  }

  console.log('✅ Seed concluído!');
  console.log(`📧 Login: admin@nexusdoc.com | Senha: senha123456`);
  console.log(`📧 Login: juridico@nexusdoc.com | Senha: senha123456`);
  console.log(`📧 Login: financeiro@nexusdoc.com | Senha: senha123456`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());