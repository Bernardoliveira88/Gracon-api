# 📋 Relatório de Refatoração — NexusDoc API

**Data:** 29/04/2026  
**Status:** ✅ Completo — Lint 0 erros · 18/18 testes passando

---

## 📊 Resumo das Mudanças

| Categoria | Arquivos Criados | Arquivos Modificados | Arquivos Removidos |
|---|---|---|---|
| Segurança | 3 | 3 | 0 |
| Arquitetura | 4 | 2 | 1 |
| Banco de Dados | 0 | 1 | 0 |
| Qualidade de Código | 2 | 6 | 0 |
| Testes | 5 | 0 | 0 |
| DevOps | 1 | 3 | 0 |
| Documentação | 0 | 2 | 0 |
| **Total** | **15** | **17** | **1** |

---

## 🔒 1. Segurança (Issues #1, #2, #3, #6, #7, #15)

### 1.1 JWT Secret — Removido fallback hardcoded

**Antes (VULNERÁVEL):**
```typescript
// server.ts
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'nexusdoc-super-secret-key-123', // ❌ EXPOSTO
});
```

**Depois (SEGURO):**
```typescript
// src/config/env.ts — validação com Zod na inicialização
const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres.'),
  // ... outras validáveis
});
export const env = envSchema.parse(process.env);

// src/app.ts — usa a variável validada
app.register(fastifyJwt, { secret: env.JWT_SECRET }); // ✅ Sem fallback
```

> [!IMPORTANT]
> **O que explicar à equipe:** Nunca coloque secrets no código-fonte, nem como fallback. Se a variável não existir, o app deve **crashar na inicialização** em vez de rodar com uma senha conhecida publicamente.

### 1.2 Rota de upload protegida com autenticação

**Antes (VULNERÁVEL):**
```typescript
// src/routes/contract.routes.ts
app.post("/contracts/upload", handler); // ❌ Sem auth — qualquer um na internet acessa
```

**Depois (SEGURO):**
```typescript
// src/http/routes/contract-routes.ts
app.addHook('onRequest', verifyJWT);           // ✅ Exige token JWT
app.addHook('onRequest', verifyWorkspaceMember); // ✅ Exige pertencer ao workspace
app.post('/contracts/upload', uploadContract);
```

**Novo arquivo criado:** [verify-workspace-member.ts](file:///c:/projetos%20faculdade/nexusdoc-api/src/http/middlewares/verify-workspace-member.ts) — middleware que valida membership no workspace sem exigir role específica.

> [!IMPORTANT]
> **O que explicar:** Toda rota que acessa dados de um workspace DEVE ter pelo menos dois checks: (1) o usuário está autenticado? (2) ele pertence ao workspace?

### 1.3 bcrypt cost aumentado de 6 para 10

**Antes:** `hash(password, 6)` — força bruta ~64x mais fácil  
**Depois:** `hash(password, 10)` — padrão seguro recomendado pelo OWASP

> [!NOTE]
> Senhas existentes continuam funcionando (bcryptjs detecta o custo pelo hash). Novas senhas serão mais seguras.

### 1.4 Eliminação de `@ts-ignore`

**Antes:**
```typescript
// @ts-ignore
const userId = request.user?.sub; // ❌ TypeScript não sabe que user existe
```

**Depois:** Criado [fastify.d.ts](file:///c:/projetos%20faculdade/nexusdoc-api/src/types/fastify.d.ts) com augmentação de tipos:
```typescript
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
```
Agora `request.user.sub` é tipado corretamente — zero `@ts-ignore` em todo o projeto.

### 1.5 `.env.example` corrigido

**Antes:**
```env
DATABASE_URL=" "postgresql://dummy:dummy@localhost:5432/dummy""  # ❌ Aspas quebradas
# JWT_SECRET não existia!
```

**Depois:**
```env
DATABASE_URL="postgresql://postgres:rootpassword@localhost:5432/nexusdoc?schema=public"
JWT_SECRET="troque-por-uma-chave-segura-com-pelo-menos-32-caracteres"
GEMINI_API_KEY=""
PORT=3000
NODE_ENV=development
```

---

## 🏗️ 2. Arquitetura (Issue #9)

### 2.1 Estrutura de pastas unificada

**Antes (inconsistente):**
```
src/
├── http/controllers/auth/        ← Dev A
├── http/controllers/workspaces/  ← Dev A  
├── http/routes/                  ← Dev A
├── routes/contract.routes.ts     ← Dev B (CONFLITO!)
├── services/                     ← Dev B
└── pipelines/                    ← Dev B
```

**Depois (consistente):**
```
src/
├── app.ts                              # NOVO — setup do Fastify (testável)
├── server.ts                           # Simplificado — só faz listen()
├── config/env.ts                       # NOVO — validação de env
├── errors/app-error.ts                 # NOVO — classe de erro
├── http/
│   ├── controllers/
│   │   ├── auth/register.ts, login.ts
│   │   ├── contracts/upload.ts         # NOVO — movido de routes/
│   │   └── workspaces/...
│   ├── middlewares/
│   │   ├── error-handler.ts            # NOVO
│   │   ├── verify-jwt.ts
│   │   ├── verify-user-role.ts
│   │   └── verify-workspace-member.ts  # NOVO
│   └── routes/
│       ├── auth-routes.ts
│       ├── contract-routes.ts          # NOVO — substituiu routes/
│       └── workspace-routes.ts
├── services/
│   ├── contract.service.ts             # NOVO — persistência
│   ├── gemini.service.ts
│   └── pdf.service.ts
├── pipelines/contract.pipeline.ts
├── lib/prisma.ts
└── types/
    ├── contract.types.ts
    └── fastify.d.ts                    # NOVO — tipos JWT
```

**Arquivo removido:** `src/routes/contract.routes.ts` (pasta `src/routes/` inteira deletada)

### 2.2 Separação `app.ts` / `server.ts`

**Por que:** Antes o app era criado e iniciado no mesmo arquivo, impossibilitando testes de integração (não dá pra importar sem subir o servidor).

```typescript
// app.ts — exporta buildApp() que pode ser usado em testes
export function buildApp() { /* ... */ return app; }

// server.ts — só inicia o servidor
const app = buildApp();
app.listen({ port: env.PORT });
```

> [!TIP]
> **O que explicar:** Sempre separem a **configuração** do app da **execução**. Isso permite testar endpoints com `app.inject()` sem subir um servidor real.

---

## 🗃️ 3. Banco de Dados — Schema Prisma (Issues #8, #10, #13, #14, #18)

### 3.1 Strings convertidas para Enums

| Campo | Antes | Depois |
|---|---|---|
| `Contract.status` | `String` | `ContractStatus` enum |
| `ContractParty.type` | `String` | `PartyType` enum |
| `ContractClause.type` | `String` | `ClauseType` enum |
| `TimelineEvent.type` | `String` | `EventType` enum |
| `Alert.channel` | `String` | `AlertChannel` enum |

```prisma
// Exemplo — antes o banco aceitava qualquer string
enum ContractStatus {
  PROCESSING
  ACTIVE
  EXPIRING
  EXPIRED
}
// Agora é impossível salvar "actve" ou "PROCESSING" — o Prisma rejeita na hora.
```

> [!IMPORTANT]
> **O que explicar:** Sempre que um campo tem valores finitos e conhecidos, usem `enum`. Isso garante integridade no banco de dados e dá autocomplete no editor.

### 3.2 Índices adicionados

```prisma
model Contract {
  @@index([workspace_id])           // Busca por workspace
  @@index([workspace_id, status])   // Filtro de contratos ativos de um workspace
}
model TimelineEvent {
  @@index([contract_id])
  @@index([scheduled_for])          // Consulta de eventos futuros
}
// + índices em ContractParty, ContractClause, ContractNote, etc.
```

> [!NOTE]
> **O que explicar:** Sem índices, toda query que filtra por `workspace_id` faz um **full table scan** — lê TODAS as linhas do banco. Com 1000 contratos, é imperceptível. Com 100.000, a query leva 10 segundos. Índices resolvem isso.

### 3.3 `@@map` em todos os models

```prisma
model User { @@map("users") }           // Tabela: users (minúsculo, plural)
model Contract { @@map("contracts") }
model ExtractedData { @@map("extracted_data") }
// etc.
```

### 3.4 `updated_at` adicionado

```prisma
model User { updated_at DateTime @updatedAt }
model Workspace { updated_at DateTime @updatedAt }
model Contract { updated_at DateTime @updatedAt }
```

### 3.5 `Alert` conectado a `Contract`

**Antes:** `Alert` só tinha relação com `User` — impossível saber *para qual contrato* era o alerta.  
**Depois:** Adicionado `contract_id String` + relação com `Contract`.

---

## 📝 4. Qualidade de Código (Issues #11, #12, #16)

### 4.1 Error handler global

**Criado:** [error-handler.ts](file:///c:/projetos%20faculdade/nexusdoc-api/src/http/middlewares/error-handler.ts)

Agora erros de Zod (validação) retornam respostas estruturadas em vez de stack traces:
```json
{
  "message": "Erro de validação.",
  "issues": {
    "email": ["E-mail inválido."],
    "password": ["Senha deve ter pelo menos 6 caracteres."]
  }
}
```

### 4.2 Validação de MIME type antes de ler o arquivo

**Antes:** O PDF service lia o arquivo INTEIRO para memória (até 20MB) e SÓ DEPOIS validava o MIME type.  
**Depois:** A validação acontece **antes** de consumir o stream:

```typescript
// pdf.service.ts — ANTES de ler
if (!ALLOWED_MIME.includes(file.mimetype)) {
  file.file.resume(); // Drena o stream para evitar leak
  throw new Error('Tipo de arquivo inválido');
}
// Só agora lê o conteúdo
for await (const chunk of file.file) { ... }
```

### 4.3 Persistência de contratos implementada

**O maior gap do projeto original:** O upload de PDF extraía dados via Gemini mas **jogava tudo fora**. Agora:

**Criado:** [contract.service.ts](file:///c:/projetos%20faculdade/nexusdoc-api/src/services/contract.service.ts)

Fluxo completo em transação atômica:
1. Cria `Contract` com título e status mapeados da extração
2. Cria `ExtractedData` com datas, valores, índice de reajuste
3. Cria `ContractParty[]` (contratante + contratado)
4. Cria `ContractClause[]` (cláusulas relevantes + penalidades)
5. Retorna o contrato com todas as relações incluídas

### 4.4 Login retorna informações do usuário

**Antes:** Retornava só `{ token }` — o frontend não sabia o nome do usuário nem seus workspaces.  
**Depois:** Retorna `{ token, user: { id, name, email, workspaces: [...] } }`.

### 4.5 Proteção contra rebaixamento do último ADMIN

**Adicionado em** `update-role.ts`: se o ADMIN tentar mudar seu próprio papel e for o último admin, a operação é bloqueada (antes só existia no `remove-member.ts`).

---

## 🧪 5. Testes — 18 testes em 5 suites

| Suite | Testes | O que testa |
|---|---|---|
| `pdf-service.test.ts` | 5 | MIME inválido, arquivo vazio, >20MB, sem header PDF, sucesso |
| `gemini-service.test.ts` | 5 | API key vazia, instanciação, parse JSON, doc inválido, JSON quebrado |
| `contract-service.test.ts` | 4 | Criação com dados, partes, cláusulas, mapeamento de status |
| `contract-pipeline.test.ts` | 2 | Pipeline completo, metadados do arquivo |
| `contract-types.test.ts` | 2 | Conformidade de tipo completo, campos null |

**Todas as dependências externas (Prisma, Gemini API) são mockadas** — os testes rodam sem banco de dados e sem internet.

> [!TIP]
> **O que explicar:** Testes unitários devem testar a **lógica** do código, não as dependências externas. Por isso mocamos o Prisma e a API do Gemini. Testes que precisam do banco real são *testes de integração* e devem ser separados.

---

## 🐳 6. DevOps

### 6.1 Docker Compose
- Removido `version: '3.8'` (deprecado)
- Credenciais configuráveis via env vars com defaults

### 6.2 Dockerfile
- Estágio de produção agora faz `npm ci --omit=dev` — não inclui `vitest`, `typescript`, etc. na imagem final

### 6.3 GitHub Actions CI
- Adicionado step `npm run test`
- Todas as env vars necessárias configuradas (`JWT_SECRET`, `GEMINI_API_KEY`)

### 6.4 package.json
- Adicionados scripts: `test`, `test:watch`, `test:coverage`
- Corrigido path do `start`: `dist/src/server.js` (antes: `dist/server.js`)

---

## 📄 7. Documentação

### README.md — Reescrito completamente
- Markdown corrigido (blocos de código fechados)
- Tabela de tecnologias
- Tabela de endpoints com auth/role requirements
- Seção de testes
- Estrutura de pastas atualizada
- Convenções da equipe

---

## ⚠️ Ação Necessária

Após o pull das mudanças, cada desenvolvedor precisa:

```bash
# 1. Instalar novas dependências (vitest)
npm install

# 2. Atualizar o .env com as novas variáveis
# Adicionar JWT_SECRET, PORT e NODE_ENV

# 3. Resetar o banco (schema mudou com enums e @@map)
npx prisma migrate dev --name refactor

# 4. Verificar que tudo funciona
npm run lint    # Zero erros TypeScript
npm test        # 18/18 testes passando
```

> [!CAUTION]
> A migração vai **recriar** as tabelas por causa dos enums e `@@map`. Se houver dados no banco local, faça backup antes ou aceite perder (é ambiente de dev).
