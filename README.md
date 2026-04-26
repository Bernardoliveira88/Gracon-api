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
   
