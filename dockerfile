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

# Boot sequence:
#   1. Aplica migrations pendentes (idempotente, fatal se falhar)
#   2. Roda seed (idempotente — recria só o workspace "NexusDoc Demo (Seed)"
#      e seus usuários `seed-*@nexusdoc.demo`. Não toca dados reais.
#      Não-fatal: se falhar, loga e segue para garantir que o API sobe.)
#   3. Backfill — re-extrai value/datas do raw_gemini_json para contratos
#      antigos com colunas null (bug de parsing pt-BR). Idempotente, não-fatal.
#   4. Inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && (npx prisma db seed || echo '[boot] seed falhou, seguindo') && (npx tsx prisma/backfill-extracted.ts || echo '[boot] backfill falhou, seguindo') && node dist/src/server.js"]