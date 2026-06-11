import 'dotenv/config';
import {
  AlertChannel,
  ClauseType,
  ContractStatus,
  EventType,
  PartyKind,
  PartyStatus,
  PartyType,
  Role,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Client próprio (não importa de src/ — a imagem de produção só tem dist/,
// e o seed roda via tsx direto deste arquivo no boot do container).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// =====================================================================
// SEED IDEMPOTENTE & ISOLADO POR NAMESPACE
// ---------------------------------------------------------------------
// Usa um nome de workspace e emails com prefixo claro de "demo" para
// poder rodar em PRODUÇÃO sem afetar dados reais. Re-rodar deleta SÓ
// os registros desse namespace.
// =====================================================================

const SEED_WORKSPACE_NAME = 'NexusDoc Demo (Seed)';
const SEED_EMAILS = [
  'seed-admin@nexusdoc.demo',
  'seed-juridico@nexusdoc.demo',
  'seed-financeiro@nexusdoc.demo',
];
const SEED_PASSWORD = 'senha123456';

// ===== CATEGORIAS (8) =====
const CATEGORIES = [
  { name: 'Locação', description: 'Contratos de aluguel de imóveis e equipamentos', color: '#3B82F6', icon: 'home' },
  { name: 'Prestação de Serviços', description: 'Acordos de prestação de serviços', color: '#10B981', icon: 'briefcase' },
  { name: 'Fornecimento', description: 'Fornecimento de bens e matérias-primas', color: '#F59E0B', icon: 'package' },
  { name: 'Licenciamento', description: 'Licenças de software e propriedade intelectual', color: '#8B5CF6', icon: 'key' },
  { name: 'Consultoria', description: 'Consultoria especializada (jurídica, técnica, etc.)', color: '#EC4899', icon: 'users' },
  { name: 'Trabalhista', description: 'Contratos de trabalho e parassindicais', color: '#EF4444', icon: 'user-check' },
  { name: 'NDA / Confidencialidade', description: 'Acordos de não divulgação', color: '#6B7280', icon: 'shield' },
  { name: 'Distribuição', description: 'Distribuição comercial e revenda', color: '#14B8A6', icon: 'truck' },
];

// ===== TEMPLATES (5) =====
const TEMPLATES = [
  {
    name: 'NDA Padrão Bilateral',
    description: 'Modelo de acordo de confidencialidade bilateral',
    body:
      'ACORDO DE CONFIDENCIALIDADE\n\nAs partes {{PARTE_A}} e {{PARTE_B}}, doravante denominadas em conjunto "Partes", celebram o presente acordo nos seguintes termos:\n\n1. As Partes comprometem-se a tratar como CONFIDENCIAL toda informação trocada no âmbito da relação comercial.\n2. A vigência é de {{PRAZO_MESES}} meses a partir da assinatura.\n3. O foro eleito é {{FORO}}.',
    variables: ['PARTE_A', 'PARTE_B', 'PRAZO_MESES', 'FORO'],
  },
  {
    name: 'Contrato Padrão de Prestação de Serviços',
    description: 'Modelo genérico para contratação de serviços PJ',
    body:
      'CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nCONTRATANTE: {{CONTRATANTE}}\nCONTRATADO: {{CONTRATADO}}\n\nOBJETO: {{OBJETO}}\nVALOR: R$ {{VALOR}}\nVIGÊNCIA: {{INICIO}} a {{TERMINO}}\nFORMA DE PAGAMENTO: {{FORMA_PAGAMENTO}}',
    variables: ['CONTRATANTE', 'CONTRATADO', 'OBJETO', 'VALOR', 'INICIO', 'TERMINO', 'FORMA_PAGAMENTO'],
  },
  {
    name: 'Termo Aditivo Genérico',
    description: 'Modelo para aditivos de valor, prazo ou escopo',
    body:
      'TERMO ADITIVO N° {{NUMERO}} AO CONTRATO {{CONTRATO_BASE}}\n\nAs partes resolvem alterar as seguintes cláusulas:\n\n{{ALTERACOES}}\n\nDemais cláusulas permanecem inalteradas.',
    variables: ['NUMERO', 'CONTRATO_BASE', 'ALTERACOES'],
  },
  {
    name: 'Carta de Encerramento Contratual',
    description: 'Notificação formal de encerramento',
    body:
      'À {{PARTE_NOTIFICADA}}\n\nServimo-nos da presente para notificar V.Sas. da decisão de encerrar o contrato {{CONTRATO}} em {{DATA_ENCERRAMENTO}}, respeitado o aviso prévio de {{AVISO_DIAS}} dias.',
    variables: ['PARTE_NOTIFICADA', 'CONTRATO', 'DATA_ENCERRAMENTO', 'AVISO_DIAS'],
  },
  {
    name: 'Procuração Ad Judicia',
    description: 'Procuração para representação jurídica',
    body:
      'PROCURAÇÃO\n\nOUTORGANTE: {{OUTORGANTE}}\nOUTORGADO: {{OUTORGADO}}\n\nPELO PRESENTE INSTRUMENTO confiro plenos poderes para representação em juízo, podendo, entre outros, propor ações, recorrer, transigir e firmar acordos.',
    variables: ['OUTORGANTE', 'OUTORGADO'],
  },
];

// ===== PARTIES (workspace-level, 10) =====
const PARTIES = [
  { name: 'NexusTech Soluções Empresariais Ltda.', cnpj: '12.345.678/0001-90', email: 'contato@nexustech.com.br', contact: '(11) 3000-1000', kind: PartyKind.INTERNAL },
  { name: 'DevSoft Sistemas e Consultoria S.A.', cnpj: '23.456.789/0001-01', email: 'comercial@devsoft.com.br', contact: '(11) 4000-2000', kind: PartyKind.SUPPLIER },
  { name: 'Grupo Meridional S.A.', cnpj: '34.567.890/0001-12', email: 'juridico@meridional.com.br', contact: '(11) 5000-3000', kind: PartyKind.CLIENT },
  { name: 'Rede Hospitalar São Lucas S.A.', cnpj: '45.678.901/0001-23', email: 'compras@saolucas.com.br', contact: '(11) 6000-4000', kind: PartyKind.CLIENT },
  { name: 'Agro Cerrado Exportações Ltda.', cnpj: '56.789.012/0001-34', email: 'financeiro@agrocerrado.com.br', contact: '(62) 3200-5000', kind: PartyKind.CLIENT },
  { name: 'Construtora Horizonte Ltda.', cnpj: '67.890.123/0001-45', email: 'obras@horizonte.com.br', contact: '(21) 2200-6000', kind: PartyKind.CLIENT },
  { name: 'Philips Medical Systems Ltda.', cnpj: '78.901.234/0001-56', email: 'vendas@philips.com.br', contact: '(11) 4001-7000', kind: PartyKind.SUPPLIER },
  { name: 'Machado Meyer Advogados', cnpj: '89.012.345/0001-67', email: 'novosnegocios@machadomeyer.com.br', contact: '(11) 3150-8000', kind: PartyKind.PARTNER },
  { name: 'Agência Criativa Ímpar Ltda.', cnpj: '90.123.456/0001-78', email: 'projetos@impar.com.br', contact: '(11) 3050-9000', kind: PartyKind.SUPPLIER },
  { name: 'Banco Nacional de Crédito S.A.', cnpj: '01.234.567/0001-89', email: 'corporate@bnc.com.br', contact: '(11) 3000-0001', kind: PartyKind.PARTNER },
];

// ===== CONTRATOS (15) =====
type ContractSeed = {
  title: string;
  status: ContractStatus;
  contratante: string;
  contratado: string;
  value: number;
  start: Date;
  end: Date;
  auto_renewal: boolean;
  readjustment_index: string | null;
  categoryIdx: number; // index em CATEGORIES
  partyContractanteIdx: number; // index em PARTIES (pode ser -1 = sem link)
  partyContratadoIdx: number;
  tags: string[];
  clauses: { type: ClauseType; content: string }[];
};

const CONTRACTS: ContractSeed[] = [
  {
    title: 'Contrato de Desenvolvimento de Software — NexusDoc',
    status: ContractStatus.ACTIVE,
    contratante: 'NexusTech Soluções Empresariais Ltda.',
    contratado: 'DevSoft Sistemas e Consultoria S.A.',
    value: 84000, start: new Date('2026-05-01'), end: new Date('2027-04-30'),
    auto_renewal: true, readjustment_index: 'IPCA anual',
    categoryIdx: 1, partyContractanteIdx: 0, partyContratadoIdx: 1,
    tags: ['tecnologia', 'desenvolvimento', 'mvp'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'O CONTRATADO compromete-se a entregar as funcionalidades acordadas em sprints quinzenais.' },
      { type: ClauseType.PENALTY, content: 'Multa de 10% sobre o valor mensal em caso de atraso superior a 5 dias úteis.' },
    ],
  },
  {
    title: 'Contrato de Licenciamento de Software ERP',
    status: ContractStatus.PENDING_LEGAL,
    contratante: 'Grupo Meridional S.A.', contratado: 'SAP Brasil Ltda.',
    value: 240000, start: new Date('2026-03-01'), end: new Date('2029-02-28'),
    auto_renewal: false, readjustment_index: 'IGP-M anual',
    categoryIdx: 3, partyContractanteIdx: 2, partyContratadoIdx: -1,
    tags: ['erp', 'enterprise', 'sap'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Licenças nominais para até 500 usuários simultâneos.' },
      { type: ClauseType.TERMINATION, content: 'Rescisão antecipada com multa de 30% do saldo remanescente.' },
    ],
  },
  {
    title: 'Contrato de Prestação de Serviços de TI',
    status: ContractStatus.EXPIRING,
    contratante: 'Construtora Horizonte Ltda.', contratado: 'TechSupport Brasil S.A.',
    value: 36000, start: new Date('2025-06-01'), end: new Date('2026-05-31'),
    auto_renewal: true, readjustment_index: null,
    categoryIdx: 1, partyContractanteIdx: 5, partyContratadoIdx: -1,
    tags: ['ti', 'suporte', 'recorrente'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Atendimento 24x7 com SLA de 4 horas para incidentes críticos.' },
    ],
  },
  {
    title: 'Contrato de Fornecimento de Equipamentos Médicos',
    status: ContractStatus.ACTIVE,
    contratante: 'Rede Hospitalar São Lucas S.A.', contratado: 'Philips Medical Systems Ltda.',
    value: 520000, start: new Date('2026-01-15'), end: new Date('2028-01-14'),
    auto_renewal: false, readjustment_index: 'IPCA anual',
    categoryIdx: 2, partyContractanteIdx: 3, partyContratadoIdx: 6,
    tags: ['saude', 'equipamentos', 'alto-valor'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Entrega em até 90 dias após emissão de ordem de compra.' },
      { type: ClauseType.PENALTY, content: 'Multa diária de 0,5% sobre o valor da OC em atraso.' },
    ],
  },
  {
    title: 'Contrato de Consultoria Jurídica',
    status: ContractStatus.ACTIVE,
    contratante: 'Agro Cerrado Exportações Ltda.', contratado: 'Machado Meyer Advogados',
    value: 18000, start: new Date('2026-02-01'), end: new Date('2027-01-31'),
    auto_renewal: true, readjustment_index: 'IPCA anual',
    categoryIdx: 4, partyContractanteIdx: 4, partyContratadoIdx: 7,
    tags: ['juridico', 'consultoria', 'retainer'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Até 40 horas mensais de consultoria jurídica preventiva.' },
    ],
  },
  {
    title: 'Contrato de Locação de Imóvel Comercial',
    status: ContractStatus.ACTIVE,
    contratante: 'Varejo Express Comércio S.A.', contratado: 'Imobiliária Central Ltda.',
    value: 72000, start: new Date('2025-09-01'), end: new Date('2028-08-31'),
    auto_renewal: false, readjustment_index: 'IGP-M anual',
    categoryIdx: 0, partyContractanteIdx: -1, partyContratadoIdx: -1,
    tags: ['imovel', 'locacao', 'longo-prazo'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Conservação e devolução nas mesmas condições recebidas.' },
      { type: ClauseType.PENALTY, content: 'Multa de 3 aluguéis em caso de rescisão antecipada.' },
    ],
  },
  {
    title: 'Contrato de Serviços de Segurança Patrimonial',
    status: ContractStatus.IN_REVIEW,
    contratante: 'Shopping Metrópolis S.A.', contratado: 'Vigor Segurança Ltda.',
    value: 96000, start: new Date('2026-04-01'), end: new Date('2027-03-31'),
    auto_renewal: true, readjustment_index: null,
    categoryIdx: 1, partyContractanteIdx: -1, partyContratadoIdx: -1,
    tags: ['seguranca', 'patrimonial'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Vigilância 24x7 em três postos fixos e rondas a cada 2 horas.' },
    ],
  },
  {
    title: 'Contrato de Publicidade e Marketing Digital',
    status: ContractStatus.PENDING_FINANCE,
    contratante: 'Banco Nacional de Crédito S.A.', contratado: 'Agência Criativa Ímpar Ltda.',
    value: 150000, start: new Date('2026-05-01'), end: new Date('2027-04-30'),
    auto_renewal: false, readjustment_index: 'IPCA anual',
    categoryIdx: 1, partyContractanteIdx: 9, partyContratadoIdx: 8,
    tags: ['marketing', 'digital', 'campanha'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Entrega de campanhas mensais com no mínimo 8 peças criativas.' },
      { type: ClauseType.PENALTY, content: 'Glosa de até 20% por descumprimento de SLA criativo.' },
    ],
  },
  {
    title: 'Contrato de Manutenção de Infraestrutura',
    status: ContractStatus.EXPIRED,
    contratante: 'Distribuidora Paulista de Energia S.A.', contratado: 'Engtech Manutenção Industrial Ltda.',
    value: 48000, start: new Date('2024-06-01'), end: new Date('2025-05-31'),
    auto_renewal: false, readjustment_index: null,
    categoryIdx: 1, partyContractanteIdx: -1, partyContratadoIdx: -1,
    tags: ['manutencao', 'industrial'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Atendimento preventivo trimestral e corretivo sob demanda.' },
    ],
  },
  {
    title: 'Contrato de Fornecimento de Matéria-Prima Têxtil',
    status: ContractStatus.ACTIVE,
    contratante: 'Fábrica Têxtil Aurora S.A.', contratado: 'Algodão do Cerrado Ltda.',
    value: 380000, start: new Date('2026-01-01'), end: new Date('2026-12-31'),
    auto_renewal: true, readjustment_index: 'IGPM mensal',
    categoryIdx: 2, partyContractanteIdx: -1, partyContratadoIdx: -1,
    tags: ['textil', 'commodities', 'recorrente'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Fornecimento mensal de 50 toneladas de algodão tipo 5 ou superior.' },
    ],
  },
  {
    title: 'Acordo de Confidencialidade — Projeto Hermes',
    status: ContractStatus.ACTIVE,
    contratante: 'NexusTech Soluções Empresariais Ltda.', contratado: 'DevSoft Sistemas e Consultoria S.A.',
    value: 0, start: new Date('2026-03-01'), end: new Date('2028-03-01'),
    auto_renewal: false, readjustment_index: null,
    categoryIdx: 6, partyContractanteIdx: 0, partyContratadoIdx: 1,
    tags: ['nda', 'projeto-hermes', 'confidencial'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Confidencialidade absoluta sobre arquitetura, código-fonte e dados de clientes.' },
      { type: ClauseType.PENALTY, content: 'Multa de R$ 500.000,00 por violação comprovada.' },
    ],
  },
  {
    title: 'Contrato de Distribuição Regional Sul',
    status: ContractStatus.ACTIVE,
    contratante: 'Indústria de Bebidas Atlântico S.A.', contratado: 'Distribuidora Vale do Sinos Ltda.',
    value: 210000, start: new Date('2026-02-15'), end: new Date('2027-02-14'),
    auto_renewal: true, readjustment_index: 'IPCA anual',
    categoryIdx: 7, partyContractanteIdx: -1, partyContratadoIdx: -1,
    tags: ['distribuicao', 'regional', 'sul'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Exclusividade na revenda dentro do território definido.' },
      { type: ClauseType.TERMINATION, content: 'Aviso prévio de 90 dias para rescisão sem justa causa.' },
    ],
  },
  {
    title: 'Contrato de Trabalho — CLT Diretor Comercial',
    status: ContractStatus.ACTIVE,
    contratante: 'NexusTech Soluções Empresariais Ltda.', contratado: 'Roberto Silva Almeida',
    value: 25000, start: new Date('2026-01-02'), end: new Date('2099-12-31'),
    auto_renewal: false, readjustment_index: 'Dissídio coletivo',
    categoryIdx: 5, partyContractanteIdx: 0, partyContratadoIdx: -1,
    tags: ['clt', 'diretoria', 'comercial'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Carga horária de 44h semanais e cláusula de não concorrência por 6 meses pós-término.' },
    ],
  },
  {
    title: 'Contrato de Manutenção Predial',
    status: ContractStatus.PROCESSING,
    contratante: 'Shopping Metrópolis S.A.', contratado: 'Conservadora Cristal Ltda.',
    value: 60000, start: new Date('2026-06-01'), end: new Date('2027-05-31'),
    auto_renewal: true, readjustment_index: 'IPCA anual',
    categoryIdx: 1, partyContractanteIdx: -1, partyContratadoIdx: -1,
    tags: ['manutencao', 'predial', 'limpeza'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Equipe fixa de 12 colaboradores em turnos alternados.' },
    ],
  },
  {
    title: 'Contrato de Cessão de Direitos Autorais — Sistema Eclipse',
    status: ContractStatus.ACTIVE,
    contratante: 'NexusTech Soluções Empresariais Ltda.', contratado: 'Maria Eduarda Cardoso (PF)',
    value: 45000, start: new Date('2026-04-10'), end: new Date('2099-12-31'),
    auto_renewal: false, readjustment_index: null,
    categoryIdx: 3, partyContractanteIdx: 0, partyContratadoIdx: -1,
    tags: ['propriedade-intelectual', 'cessao'],
    clauses: [
      { type: ClauseType.OBLIGATION, content: 'Cessão total e definitiva de direitos patrimoniais sobre o código.' },
    ],
  },
];

// ===== ALERT CONFIGS =====
const ALERT_CONFIGS = [
  { type: 'EXPIRATION_30D', days_before: 30, enabled: true },
  { type: 'EXPIRATION_7D', days_before: 7, enabled: true },
  { type: 'RENEWAL', days_before: 60, enabled: true },
];

// =====================================================================
// EXECUÇÃO
// =====================================================================

async function clearPreviousSeed() {
  console.log('🧹 Limpando seed anterior (escopo NexusDoc Demo)...');
  // Deleta workspace -> cascateia em contracts/parties/templates/etc
  const workspaces = await prisma.workspace.findMany({ where: { name: SEED_WORKSPACE_NAME } });
  for (const ws of workspaces) {
    await prisma.workspace.delete({ where: { id: ws.id } });
  }
  // Deleta usuários do seed por email
  await prisma.user.deleteMany({ where: { email: { in: SEED_EMAILS } } });
}

async function main() {
  console.log('🌱 Iniciando seed NexusDoc Demo...');
  await clearPreviousSeed();

  // ----- Workspace -----
  const workspace = await prisma.workspace.create({
    data: { name: SEED_WORKSPACE_NAME, plan: 'PRO' },
  });
  console.log(`  ✓ Workspace: ${workspace.name}`);

  // ----- Usuários -----
  const pwHash = await hash(SEED_PASSWORD, 8);
  const admin = await prisma.user.create({
    data: {
      name: 'Daniel Admin',
      email: SEED_EMAILS[0],
      password_hash: pwHash,
      workspaces: { create: { workspace_id: workspace.id, role: Role.ADMIN } },
    },
  });
  const legal = await prisma.user.create({
    data: {
      name: 'Ana Jurídico',
      email: SEED_EMAILS[1],
      password_hash: pwHash,
      workspaces: { create: { workspace_id: workspace.id, role: Role.LEGAL } },
    },
  });
  const finance = await prisma.user.create({
    data: {
      name: 'Carlos Financeiro',
      email: SEED_EMAILS[2],
      password_hash: pwHash,
      workspaces: { create: { workspace_id: workspace.id, role: Role.FINANCE } },
    },
  });
  console.log(`  ✓ Usuários: 3 (admin, legal, finance)`);

  // ----- Categorias -----
  const categories = [];
  for (const c of CATEGORIES) {
    categories.push(await prisma.category.create({ data: { ...c, workspace_id: workspace.id } }));
  }
  console.log(`  ✓ Categorias: ${categories.length}`);

  // ----- Templates -----
  for (const t of TEMPLATES) {
    await prisma.contractTemplate.create({
      data: {
        workspace_id: workspace.id,
        name: t.name,
        description: t.description,
        body: t.body,
        variables: t.variables,
        created_by: admin.id,
      },
    });
  }
  console.log(`  ✓ Templates: ${TEMPLATES.length}`);

  // ----- Parties (workspace-level) -----
  const parties = [];
  for (const p of PARTIES) {
    parties.push(await prisma.party.create({
      data: { ...p, workspace_id: workspace.id, status: PartyStatus.ACTIVE },
    }));
  }
  console.log(`  ✓ Parties: ${parties.length}`);

  // ----- Alert Configs -----
  for (const cfg of ALERT_CONFIGS) {
    await prisma.alertConfig.create({ data: { ...cfg, workspace_id: workspace.id } });
  }
  console.log(`  ✓ AlertConfigs: ${ALERT_CONFIGS.length}`);

  // ----- Contratos -----
  let contractsCreated = 0;
  for (const c of CONTRACTS) {
    const category = categories[c.categoryIdx];
    const partyContractante = c.partyContractanteIdx >= 0 ? parties[c.partyContractanteIdx] : null;
    const partyContratado = c.partyContratadoIdx >= 0 ? parties[c.partyContratadoIdx] : null;

    const contract = await prisma.contract.create({
      data: {
        workspace_id: workspace.id,
        category_id: category.id,
        title: c.title,
        status: c.status,
        file_url: `https://storage.nexusdoc.demo/contracts/${c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.pdf`,
        data: {
          create: {
            start_date: c.start,
            end_date: c.end,
            value: c.value || null,
            auto_renewal: c.auto_renewal,
            readjustment_index: c.readjustment_index,
            notice_days: c.auto_renewal ? 30 : null,
            raw_gemini_json: {
              titulo: c.title,
              partes: { contratante: c.contratante, contratado: c.contratado },
              prazos: {
                inicio: c.start.toISOString().slice(0, 10),
                termino: c.end.toISOString().slice(0, 10),
                renovacaoAutomatica: c.auto_renewal,
              },
              valor: { total: c.value, moeda: 'BRL', reajuste: c.readjustment_index },
              clausulasRelevantes: c.clauses.map((cl) => cl.content),
              alertas: [],
              statusExtracao: 'completo',
            },
          },
        },
        parties: {
          create: [
            { name: c.contratante, type: PartyType.CONTRACTOR, party_id: partyContractante?.id ?? null },
            { name: c.contratado, type: PartyType.HIRED, party_id: partyContratado?.id ?? null },
          ],
        },
        clauses: { create: c.clauses },
        tags: { create: c.tags.map((t) => ({ tag: t })) },
        events: {
          create: [
            { type: EventType.EXPIRATION, scheduled_for: c.end, description: `Vencimento em ${c.end.toLocaleDateString('pt-BR')}` },
            { type: EventType.RENEWAL, scheduled_for: new Date(c.end.getTime() - 30 * 86400000), description: 'Janela de renovação (30d antes)' },
          ],
        },
      },
    });

    // Aprovação LEGAL em contratos ACTIVE/PENDING_FINANCE
    if (c.status === ContractStatus.ACTIVE || c.status === ContractStatus.PENDING_FINANCE) {
      await prisma.contractApproval.create({
        data: {
          contract_id: contract.id,
          user_id: legal.id,
          step: 'LEGAL',
          decision: 'APPROVED',
          decided_at: new Date(),
          comment: 'Cláusulas em conformidade. Aprovado.',
        },
      });
    }
    // Aprovação FINANCE em ACTIVE
    if (c.status === ContractStatus.ACTIVE && c.value > 0) {
      await prisma.contractApproval.create({
        data: {
          contract_id: contract.id,
          user_id: finance.id,
          step: 'FINANCE',
          decision: 'APPROVED',
          decided_at: new Date(),
          comment: 'Orçamento previsto. Aprovado financeiramente.',
        },
      });
    }
    // Nota em alguns
    if (contractsCreated % 3 === 0) {
      await prisma.contractNote.create({
        data: {
          contract_id: contract.id,
          user_id: admin.id,
          content: 'Acompanhamento periódico recomendado.',
        },
      });
    }
    // Alerta de expiração para EXPIRING/EXPIRED
    if (c.status === ContractStatus.EXPIRING || c.status === ContractStatus.EXPIRED) {
      await prisma.alert.create({
        data: {
          user_id: admin.id,
          contract_id: contract.id,
          type: 'EXPIRATION',
          days_before: 30,
          channel: AlertChannel.EMAIL,
        },
      });
    }

    contractsCreated++;
  }
  console.log(`  ✓ Contratos: ${contractsCreated} (com cláusulas, tags, eventos, aprovações)`);

  console.log('\n✅ Seed concluído!\n');
  console.log('📧 Credenciais de acesso:');
  console.log(`   ADMIN:     ${SEED_EMAILS[0]} | senha: ${SEED_PASSWORD}`);
  console.log(`   LEGAL:     ${SEED_EMAILS[1]} | senha: ${SEED_PASSWORD}`);
  console.log(`   FINANCE:   ${SEED_EMAILS[2]} | senha: ${SEED_PASSWORD}`);
  console.log(`\n🏢 Workspace: ${workspace.name} (id: ${workspace.id})\n`);
}

main()
  .catch((err) => {
    console.error('❌ Seed falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
