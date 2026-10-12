# syntax=docker/dockerfile:1

# --- Base común -------------------------------------------------------------
FROM node:24.21.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN npm install --global pnpm@12.11.2
WORKDIR /app

# --- Dependencias (incluye dev, necesarias para compilar) -------------------
# Se copian el schema y la config de Prisma antes de instalar porque el script
# `prepare` ejecuta `prisma generate` (genera el cliente en src/generated).
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Compilación ------------------------------------------------------------
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm db:generate && pnpm build

# --- Dependencias de producción --------------------------------------------
# `--ignore-scripts` evita que se ejecute `prepare` (que necesita el CLI de
# Prisma, solo presente en dev). El cliente ya viene compilado en `dist`.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# --- Imagen final (mínima, usuario no root) --------------------------------
FROM node:24.21.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
