# ⚙️ [Nexus Doc] — API Backend

Repositório principal do backend do MVP de gestão inteligente de contratos. Construído com Node.js, Fastify e Prisma, integrado à API do Google Gemini (Flash 2.5) para processamento de PDFs.

## 🛠 Tecnologias

* **Framework:** Node.js + Fastify
* **Linguagem:** TypeScript
* **ORM:** Prisma
* **Banco de Dados:** PostgreSQL (via Docker)
* **IA:** `@google/generative-ai` (Gemini 2.5 Flash)

## 🚀 Como rodar localmente (Setup)

### Pré-requisitos
* Node.js v20+ instalado.
* Docker e Docker Compose instalados e rodando (essencial para o banco de dados local).
* Chave de API do Google AI Studio (Gemini).

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone git@github.com:Repositorio-de-projetos-da-faculdade/nexusDoc-api.git

   
2. **Instale as dependências:**
   ```bash
   npm install
   

3. **Configure as Variáveis de Ambiente:**
    ```bash
    cp .env.example .env
Abra o .env e insira sua GEMINI_API_KEY e a DATABASE_URL.
4.  **Suba o Banco de Dados (Docker):**
     Isso vai iniciar um container do PostgreSQL rodando na porta 5432.
    ```bash
    
    docker compose up -d
5. **Rode as migrações do prisma:**
   ```bash
   npx prisma migrate dev --name init

6. **inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev

# 📦 Estrutura de Pastas Sugerida
**/prisma:** Schema do banco de dados e migrações.

**/src/routes:** Endpoints da API (Fastify routes).

**/src/services:** Lógica de negócio (Integração Gemini, extração de texto, etc).

**/src/controllers:** Intermediários entre as rotas e os serviços.

**⚠️ Padrões da Equipe**
Commits: Mensagens curtas e descritivas (ex: feat: add document parsing route).

Pull Requests: Todo código deve ser enviado via PR para a main. As Actions do GitHub (Lint e Build) devem passar antes do merge.
