# ==========================================
# Estágio 1: Build
# ==========================================
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL fictícia para o Prisma gerar os tipos sem conectar no banco
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
RUN npm run build

# ==========================================
# Estágio 2: Produção (somente dependências de produção)
# ==========================================
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Healthcheck para orquestração (Docker Compose / Kubernetes)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]