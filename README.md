# ⚙️ NexusDoc API — Backend

Repositório principal do backend do MVP de gestão inteligente de contratos. Construído com Node.js, Fastify e Prisma, integrado à API do Google Gemini (2.5 Flash) para extração automática de dados de PDFs contratuais.

## 🛠 Tecnologias

| Tecnologia | Uso |
|---|---|
| **Node.js 20** | Runtime |
| **Fastify 5** | Framework HTTP |
| **TypeScript** | Linguagem |
| **Prisma 7** | ORM |
| **PostgreSQL 15 + pgvector** | Banco de dados + busca semântica |
| **Zod** | Validação de dados |
| **Gemini 2.5 Flash** | IA para extração de contratos |
| **Resend** | Envio de e-mails |
| **Vitest** | Testes |
| **Docker** | Containerização |

## 🚀 Como rodar

### Pré-requisitos

- Docker e Docker Compose instalados
- Chave de API do Google AI Studio (Gemini) — [obter aqui](https://aistudio.google.com/apikey)
- Chave de API do Resend (e-mails) — [obter aqui](https://resend.com/api-keys)

### Opção 1 — Docker Compose (recomendado)

Sobe o banco de dados **e** a API em containers, sem precisar instalar Node.js localmente.

1. **Clone o repositório:**
   ```bash
   git clone git@github.com:Repositorio-de-projetos-da-faculdade/nexusDoc-api.git
   cd nexusDoc-api
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e preencha:
   - `JWT_SECRET` — Chave secreta para tokens JWT (mínimo 32 caracteres)
   - `GEMINI_API_KEY` — Sua chave do Google AI Studio
   - `RESEND_API_KEY` — Sua chave do Resend

   > A `DATABASE_URL` é sobrescrita automaticamente pelo Docker Compose para apontar ao container PostgreSQL interno. Você não precisa alterar.

3. **Suba tudo:**
   ```bash
   docker compose up -d --build
   ```
   Isso irá:
   - Subir o PostgreSQL com pgvector
   - Fazer o build da API (multi-stage)
   - Rodar as migrações automaticamente (`prisma migrate deploy`)
   - Iniciar o servidor

4. **Verifique:**
   ```bash
   curl http://localhost:3000
   # { "status": "NexusDoc API Online 🚀", "environment": "development" }
   ```

5. **Ver logs:**
   ```bash
   docker compose logs -f api
   ```

6. **Parar tudo:**
   ```bash
   docker compose down
   ```

### Opção 2 — Desenvolvimento local (com hot-reload)

Para desenvolvimento com hot-reload via `tsx watch`. Usa Docker apenas para o banco de dados.

1. **Clone e instale:**
   ```bash
   git clone git@github.com:Repositorio-de-projetos-da-faculdade/nexusDoc-api.git
   cd nexusDoc-api
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e configure:
   - `DATABASE_URL` — `postgresql://postgres:rootpassword@localhost:5432/nexusdoc?schema=public`
   - `JWT_SECRET` — Chave secreta para tokens JWT (mínimo 32 caracteres)
   - `GEMINI_API_KEY` — Sua chave do Google AI Studio
   - `RESEND_API_KEY` — Sua chave do Resend

3. **Suba apenas o banco de dados:**
   ```bash
   docker compose up -d postgres
   ```

4. **Rode as migrações:**
   ```bash
   npx prisma migrate dev
   ```

5. **Inicie o servidor (com hot-reload):**
   ```bash
   npm run dev
   ```

O servidor estará disponível em `http://localhost:3000`.

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Rodar em modo watch
npm run test:watch

# Rodar com cobertura de código
npm run test:coverage
```

## 📦 Estrutura de Pastas

```
src/
├── app.ts                          # Configuração do Fastify (testável)
├── server.ts                       # Entrypoint (importa buildApp e inicia)
├── config/
│   └── env.ts                      # Validação de variáveis de ambiente (Zod)
├── errors/
│   └── app-error.ts                # Classe de erro customizada
├── http/
│   ├── controllers/
│   │   ├── auth/                   # Register, Login
│   │   ├── contracts/              # Upload, aprovação, busca, versionamento
│   │   └── workspaces/             # Convites, membros, roles
│   ├── middlewares/
│   │   ├── error-handler.ts        # Handler global de erros
│   │   ├── verify-jwt.ts           # Autenticação JWT
│   │   ├── verify-user-role.ts     # Autorização por papel
│   │   └── verify-workspace-member.ts  # Verificação de membro
│   └── routes/
│       ├── auth-routes.ts
│       ├── contract-routes.ts
│       └── workspace-routes.ts
├── jobs/
│   └── alert.jobs.ts               # Cron job de alertas diários
├── lib/
│   └── prisma.ts                   # Singleton do Prisma Client
├── pipelines/
│   └── contract.pipeline.ts        # Orquestração: PDF → Gemini
├── services/
│   ├── contract.service.ts         # Persistência de contratos
│   ├── email.service.ts            # Envio de e-mails via Resend
│   ├── embedding.service.ts        # Embeddings vetoriais (Gemini)
│   ├── gemini.service.ts           # Integração com Google Gemini
│   └── pdf.service.ts              # Leitura e validação de PDF
└── types/
    ├── contract.types.ts           # Interfaces de contratos
    └── fastify.d.ts                # Augmentação de tipos JWT
```

## 🔗 Endpoints da API

### Auth
| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Cria usuário + workspace | ❌ |
| `POST` | `/auth/login` | Retorna JWT token | ❌ |

### Workspaces
| Método | Rota | Descrição | Auth | Role |
|---|---|---|---|---|
| `POST` | `/workspaces/invites` | Envia convite | ✅ | ADMIN |
| `POST` | `/workspaces/invites/:token/accept` | Aceita convite | ✅ | — |
| `PATCH` | `/workspaces/members/:userId/role` | Altera papel | ✅ | ADMIN |
| `DELETE` | `/workspaces/members/:userId` | Remove membro | ✅ | ADMIN |

### Contratos
| Método | Rota | Descrição | Auth | Header |
|---|---|---|---|---|
| `POST` | `/contracts/upload` | Upload + análise por IA | ✅ | `x-workspace-id` |
| `GET` | `/contracts/search` | Busca semântica por contratos | ✅ | `x-workspace-id` |
| `POST` | `/contracts/:id/approve` | Aprovar/rejeitar contrato | ✅ | `x-workspace-id` |
| `POST` | `/contracts/:id/versions` | Upload de nova versão | ✅ | `x-workspace-id` |
| `GET` | `/contracts/:id/versions` | Listar versões do contrato | ✅ | `x-workspace-id` |

> Todas as rotas autenticadas esperam o header `Authorization: Bearer <token>`.
> Rotas de contrato esperam o header `x-workspace-id: <uuid>`.

## 🐳 Docker

### Build manual (sem Compose)

```bash
# Build da imagem
docker build -t nexusdoc-api .

# Rodar o container (precisa de um PostgreSQL acessível)
docker run -d \
  --name nexusdoc-api \
  -p 3000:3000 \
  --env-file .env \
  nexusdoc-api
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de conexão do PostgreSQL |
| `JWT_SECRET` | ✅ | Chave secreta para JWT (mín. 32 caracteres) |
| `GEMINI_API_KEY` | ✅ | Chave de API do Google AI Studio |
| `RESEND_API_KEY` | ✅ | Chave de API do Resend |
| `PORT` | ❌ | Porta do servidor (padrão: `3000`) |
| `NODE_ENV` | ❌ | Ambiente: `development`, `production` ou `test` |

## ⚠️ Padrões da Equipe

- **Commits:** Mensagens curtas e descritivas (ex: `feat: add document parsing route`)
- **Pull Requests:** Todo código deve ser enviado via PR para a `main`
- **CI:** As Actions do GitHub (Lint, Test e Build) devem passar antes do merge
- **Validação:** Usar Zod para todos os inputs de request (body, params, query)
- **Erros:** Lançar `AppError` para erros de negócio; o error handler global cuida do resto
- **Env Vars:** Sempre usar `env.*` de `config/env.ts` — nunca `process.env` direto
