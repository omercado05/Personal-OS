# syntax=docker/dockerfile:1

# --- Base común -------------------------------------------------------------
FROM node:24.21.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.11.2
WORKDIR /app

# --- Dependencias -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Compilación (Next.js standalone) --------------------------------------
FROM deps AS build
COPY . .
# Las variables NEXT_PUBLIC_* se incrustan en el bundle en tiempo de build.
# (La secret server key NO se pasa aquí: es solo de servidor y se inyecta en
# tiempo de ejecución; ver docker-compose.yml.)
ARG NEXT_PUBLIC_API_URL="http://localhost:4000"
ARG NEXT_PUBLIC_HEXCLAVE_API_URL="http://localhost:8102"
ARG NEXT_PUBLIC_HEXCLAVE_PROJECT_ID=""
ARG NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_HEXCLAVE_API_URL=$NEXT_PUBLIC_HEXCLAVE_API_URL \
    NEXT_PUBLIC_HEXCLAVE_PROJECT_ID=$NEXT_PUBLIC_HEXCLAVE_PROJECT_ID \
    NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY=$NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY
RUN pnpm build

# --- Imagen final (mínima, usuario no root) --------------------------------
FROM node:24.21.0-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
