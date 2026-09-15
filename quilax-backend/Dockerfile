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

ENV NODE_ENV=production
EXPOSE 3000

# Bind immediately (health check). Migrations/columns run after listen in index.js.
CMD ["node", "src/index.js"]
