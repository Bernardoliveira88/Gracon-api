# ⚙️ NexusDoc API — Backend

Repositório principal do backend do MVP de gestão inteligente de contratos. Construído com Node.js, Fastify e Prisma, integrado à API do Google Gemini (2.5 Flash) para extração automática de dados de PDFs contratuais.

## 🛠 Tecnologias

| Tecnologia | Uso |
|---|---|
| **Node.js 20+** | Runtime |
| **Fastify 5** | Framework HTTP |
| **TypeScript** | Linguagem |
| **Prisma 7** | ORM |
| **PostgreSQL 15** | Banco de dados |
| **Zod** | Validação de dados |
| **Gemini 2.5 Flash** | IA para extração de contratos |
| **Vitest** | Testes |
| **Docker** | Containerização |

## 🚀 Como rodar localmente

### Pré-requisitos

- Node.js v20+ instalado
- Docker e Docker Compose instalados
- Chave de API do Google AI Studio (Gemini)

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone git@github.com:Repositorio-de-projetos-da-faculdade/nexusDoc-api.git
   cd nexusDoc-api
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e configure:
   - `DATABASE_URL` — URL de conexão do PostgreSQL
   - `JWT_SECRET` — Chave secreta para tokens JWT (mínimo 32 caracteres)
   - `GEMINI_API_KEY` — Sua chave do Google AI Studio

4. **Suba o banco de dados:**
   ```bash
   docker compose up -d
   ```

5. **Rode as migrações:**
   ```bash
   npx prisma migrate dev
   ```

6. **Inicie o servidor:**
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
├── server.ts                       # Entrypoint (inicia o servidor)
├── config/
│   └── env.ts                      # Validação de variáveis de ambiente
├── errors/
│   └── app-error.ts                # Classe de erro customizada
├── http/
│   ├── controllers/
│   │   ├── auth/                   # Register, Login
│   │   ├── contracts/              # Upload de contratos
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
├── lib/
│   └── prisma.ts                   # Singleton do Prisma Client
├── pipelines/
│   └── contract.pipeline.ts        # Orquestração: PDF → Gemini
├── services/
│   ├── contract.service.ts         # Persistência de contratos
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

> Todas as rotas autenticadas esperam o header `Authorization: Bearer <token>`.
> Rotas de contrato e workspace esperam o header `x-workspace-id: <uuid>`.

## ⚠️ Padrões da Equipe

- **Commits:** Mensagens curtas e descritivas (ex: `feat: add document parsing route`)
- **Pull Requests:** Todo código deve ser enviado via PR para a `main`
- **CI:** As Actions do GitHub (Lint, Test e Build) devem passar antes do merge
- **Validação:** Usar Zod para todos os inputs de request (body, params, query)
- **Erros:** Lançar `AppError` para erros de negócio; o error handler global cuida do resto
