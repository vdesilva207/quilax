FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY config ./config
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 3000

# Best-effort migrate + ensure columns, then boot (same as Render Node start)
CMD ["node", "scripts/render-start.mjs"]
