# NexusDoc - Documentação de Integração do Frontend

Esta documentação fornece todos os detalhes técnicos necessários para a equipe de frontend integrar com a API do NexusDoc, incluindo configurações de rede do container, autenticação e contratos de dados (schemas) das rotas.

## 1. Conexão com o Container

A API do NexusDoc roda num container Docker sob o nome `nexusdoc-api` na porta interna `3000`. O arquivo `docker-compose.yml` já expõe essa porta para o host. 

- **Frontend rodando na sua máquina (host)**: Acesse a API através de `http://localhost:3000`.
- **Frontend rodando dentro do mesmo Docker Compose**: Acesse a API através do nome do serviço, `http://nexusdoc-api:3000`.

*(Nota: Se houver erros de CORS no navegador durante o desenvolvimento no host, solicite à equipe de backend a ativação do plugin `@fastify/cors` no Fastify).*

A API expõe as rotas do OpenAPI (Swagger). Você pode visualizar a documentação interativa ou baixar o schema JSON em:
- **Swagger UI:** `http://localhost:3000/docs`
- **OpenAPI JSON:** `http://localhost:3000/docs/json`

---

## 2. Autenticação e Cabeçalhos (Headers)

A maior parte da API é protegida e exige autenticação e contexto de workspace.

### Headers Obrigatórios nas Requisições Privadas:
```http
Authorization: Bearer <seu_token_jwt_aqui>
workspace-id: <uuid_do_workspace_selecionado>
```
* **Onde conseguir?** Ambos vêm na resposta da rota de `/login`. O frontend deve guardar o Token e apresentar a lista de workspaces para o usuário escolher o workspace ativo, guardando seu ID para enviar no header `workspace-id`.

---

## 3. Rotas de Autenticação

### `POST /register`
Registra um novo usuário e já cria um workspace associado a ele.

- **Body (JSON):**
  ```json
  {
    "name": "Nome Completo",
    "email": "user@email.com",
    "password": "senha_segura",
    "workspace_name": "Nome da Empresa"
  }
  ```
- **Respostas:**
  - `201 Created`: `{ "message": "...", "userId": "uuid", "workspaceId": "uuid" }`
  - `409 Conflict`: O email já existe.

### `POST /login`
Autentica o usuário na plataforma e retorna o JWT.

- **Body (JSON):**
  ```json
  {
    "email": "user@email.com",
    "password": "senha_segura"
  }
  ```
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1...",
      "user": {
        "id": "uuid",
        "name": "Nome Completo",
        "email": "user@email.com",
        "workspaces": [
          { "id": "uuid", "name": "Nome da Empresa", "role": "ADMIN" }
        ]
      }
    }
    ```

---

## 4. Rotas de Workspaces

Todas exigem os cabeçalhos `Authorization` e `workspace-id` (exceto o `/accept`, que exige apenas `Authorization`). As rotas de manipulação exigem que o usuário que faz o pedido tenha `role = ADMIN`.

### `POST /invites/:token/accept`
Aceita um convite pendente. Requer que o usuário já esteja logado (`Authorization`).
- **Respostas:** `200 OK: { "message": "..." }`

### `POST /invites` (Requer ADMIN)
Gera um convite para o workspace.
- **Body:** `{ "email": "novo@email.com", "role": "ADMIN | LEGAL | FINANCE | VIEWER" }`
- **Respostas:** `201 Created: { "message": "...", "token": "uuid" }`

### `PATCH /members/:userId/role` (Requer ADMIN)
Atualiza o papel de um membro existente no workspace.
- **Body:** `{ "role": "ADMIN | LEGAL | FINANCE | VIEWER" }`
- **Respostas:** `204 No Content`

### `DELETE /members/:userId` (Requer ADMIN)
Remove o membro do workspace atual.
- **Respostas:** `204 No Content`

---

## 5. Rotas de Contratos

Exigem cabeçalhos `Authorization` e `workspace-id`.

### `POST /contracts/upload`
Faz o upload de um PDF e retorna os dados extraídos pelo Gemini.
- **Header:** `Content-Type: multipart/form-data`
- **Body (FormData):** `file`: O arquivo PDF selecionado.
- **Respostas:**
  - `201 Created`:
    ```json
    {
      "ok": true,
      "data": {
        "contract": { /* Objeto Contract do Banco de Dados */ },
        "extraction": { /* Objeto com os campos extraídos do PDF */ }
      }
    }
    ```

### `GET /contracts/search`
Busca semântica no conteúdo dos contratos enviados no workspace.
- **Query Params:** `?q=termo_de_busca&limit=10`
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "ok": true,
      "query": "termo",
      "total": 1,
      "results": [
        {
          "contract_id": "uuid",
          "title": "Nome.pdf",
          "status": "ACTIVE",
          "similarity": 0.89,
          "snippet": "...texto em volta do termo de busca..."
        }
      ]
    }
    ```

### `POST /contracts/:id/approve`
Registra decisão Jurídica ou Financeira sobre o contrato.
- **Body (JSON):**
  ```json
  {
    "user_id": "uuid",
    "decision": "APPROVED" ou "REJECTED",
    "comment": "Comentário opcional"
  }
  ```
- **Respostas:** `200 OK: { "ok": true, "status": "PENDING | APPROVED | REJECTED" }`

### `POST /contracts/:id/versions`
Faz o upload de uma nova versão do contrato (Ex: versão final assinada).
- **Header:** `Content-Type: multipart/form-data`
- **Body (FormData):** `file`: O arquivo PDF selecionado.
- **Respostas:** `201 Created` com o mesmo formato de `/upload`.

### `GET /contracts/:id/versions`
Lista todas as versões históricas do contrato.
- **Respostas:**
  - `200 OK`:
    ```json
    {
      "ok": true,
      "data": [
        {
          "id": "uuid",
          "contract_id": "uuid",
          "file_url": "...",
          "version_num": 1,
          "created_at": "2026-05-17T..."
        }
      ]
    }
    ```

### `GET /contracts/report`
Exporta um relatório de todos os contratos do workspace. Útil para baixar planilhas ou relatórios consolidados em PDF.
- Suporta query params para especificar formato (depende da implementação do export-report). Pode retornar arquivo ou stream.
