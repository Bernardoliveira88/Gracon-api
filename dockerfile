# ==========================================
# Estágio 1: Build
# ==========================================
FROM node:20-slim AS builder

# Instala dependências nativas necessárias para o Prisma engine
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# npm ci é mais rápido e seguro para CI/CD
RUN npm ci

COPY . .

# Injetamos uma URL fictícia para o Prisma conseguir gerar os tipos (generate)
# sem tentar conectar no banco real durante o build da imagem.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Compila o TypeScript para JavaScript
RUN npm run build

# ==========================================
# Estágio 2: Produção
# ==========================================
FROM node:20-slim

# Repete a instalação do openssl necessária para o runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia apenas o necessário do estágio de build para manter a imagem leve
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Usamos um shell script ou o formato de array para o CMD.
# Nota: "migrate deploy" é o comando correto para produção (não reseta o banco).
CMD sh -c "npx prisma migrate deploy && node dist/server.js"