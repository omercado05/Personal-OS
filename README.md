# Personal OS

Aplicación web personal y privada para organizar proyectos, conocimiento/apuntes, ideas,
recursos y módulos personales. Desarrollada y mantenida por una sola persona, desplegada en
un servidor personal con Docker y Dockploy.

> **Estado actual: Fase 8 completada.** Backend (Fastify + Prisma + MySQL) y frontend
> (Next.js: dashboard, Knowledge, Projects, búsqueda global) operativos con autenticación
> Hexclave self-hosted. **Fase 9 en curso** (hardening: rate limiting y headers; Docker de
> producción; parametrización del host público; backups; acceso remoto con Tailscale).
> Consulta `DEVELOPMENT_PLAN.md` para el plan, `PROGRESS.md` para el estado y
> [`docs/runbook.md`](./docs/runbook.md) para la operación diaria.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend:** Node.js + TypeScript + Fastify 5 (API REST `/api/v1`)
- **Base de datos:** MySQL 8.4
- **ORM:** Prisma 7.10.0 (+ `@prisma/adapter-mariadb`)
- **Autenticación:** Hexclave (antes Stack Auth) — **self-hosted** con `stackauth/server`
- **Contenedores:** Docker + docker-compose
- **Despliegue:** Dockploy
- **Gestor de paquetes:** pnpm 12
- **Node:** 24 LTS

## Estructura

```text
/
├─ frontend/             # App Next.js (package.json propio)
├─ backend/              # API Fastify (package.json propio)
│  ├─ prisma/            # (Fase 2) schema.prisma + migraciones
│  └─ src/
│     ├─ config/         # lectura de variables de entorno
│     ├─ lib/            # utilidades (logger, ...)
│     ├─ routes/         # rutas de la API
│     ├─ app.ts          # construcción de Fastify
│     └─ server.ts       # arranque
├─ docker-compose.yml    # entorno local (6 servicios)
├─ docker/               # ficheros de apoyo (p. ej. entrypoint de Hexclave)
├─ scripts/              # utilidades (p. ej. backup.sh)
├─ docs/                 # documentación de operación (runbook)
├─ .env.example          # todas las variables, valores ficticios
├─ DEVELOPMENT_PLAN.md   # plan detallado y ADRs
├─ PROGRESS.md           # memoria persistente del proyecto
└─ README.md
```

## Entorno de desarrollo

El desarrollo se realiza en **WSL2 (Ubuntu) + Docker Desktop**, con el repositorio dentro del
filesystem de Linux y Node LTS + pnpm instalados **dentro de WSL**. Ver ADR-008 en
`DEVELOPMENT_PLAN.md` y `PROGRESS.md`.

El stack local (`docker-compose.yml`) consta de **6 servicios**:

```text
frontend · backend · mysql · postgres · clickhouse · hexclave-server
```

`mysql` se publica solo en `127.0.0.1:3306` (para migraciones/copias desde el host);
`postgres` y `clickhouse` **no se publican** (solo red interna de Docker).

## Puesta en marcha

### 1. Requisitos

- Docker Desktop (con integración WSL2) — o Docker Engine + plugin Compose.
- Node **24 LTS** y **pnpm 12** (`npm install -g pnpm@12`).
- Git.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y ajusta, como mínimo, las contraseñas y los secretos de Hexclave. Para generar
secretos:

```bash
# STACK_SERVER_SECRET
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
# CRON_SECRET y claves internas
openssl rand -hex 32
```

### Modo A — Desarrollo (rápido, hot-reload)

Infraestructura en contenedores + aplicaciones con `pnpm dev` en WSL:

```bash
# 1) Levanta la infraestructura (base de datos y auth)
docker compose up -d mysql postgres clickhouse hexclave-server

# 2) Backend (terminal 1)
cd backend && pnpm install && pnpm dev        # http://localhost:4000

# 3) Frontend (terminal 2)
cd frontend && pnpm install && pnpm dev       # http://localhost:3000
```

> El frontend fuera de Docker **no** lee el `.env` de la raíz. Para que la autenticación
> funcione en este modo, crea `frontend/.env.local` con `NEXT_PUBLIC_API_URL` y las
> variables públicas de Hexclave derivadas de las de la raíz:
> `NEXT_PUBLIC_HEXCLAVE_API_URL`, `NEXT_PUBLIC_HEXCLAVE_PROJECT_ID` y
> `NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY` (ver comentarios en `.env.example`).

### Modo B — Integración (tipo producción)

Levanta los 6 servicios construyendo las imágenes:

```bash
docker compose up --build
```

> La primera vez, `hexclave-server` ejecuta migraciones y el *seed* del usuario
> administrador; puede tardar unos minutos en quedar *healthy*.

### Servicios locales

| Servicio            | URL                     | Notas                                   |
| ------------------- | ----------------------- | --------------------------------------- |
| Frontend            | http://localhost:3000   | Next.js                                 |
| Backend | http://localhost:4000 | `GET /api/v1/health` · `GET /api/v1/health/ready` |
| Hexclave dashboard  | http://localhost:8101   | Acceso con el usuario administrador      |
| Hexclave API        | http://localhost:8102   | Usada por el frontend y el backend       |
| MySQL | 127.0.0.1:3306 | Solo localhost (migraciones/copias) |
| Postgres / ClickHouse | *(interno)* | No expuestos al host |

## Comandos por proyecto

En `backend/` y `frontend/` (proyectos independientes):

```bash
pnpm dev            # desarrollo con recarga
pnpm build          # compilación de producción
pnpm start          # ejecuta el build
pnpm typecheck      # TypeScript estricto
pnpm lint           # ESLint
pnpm format         # Prettier (formateo)
pnpm db:generate    # genera cliente Prisma (src/generated/)
pnpm db:migrate      # migraciones en desarrollo (migrate dev)
pnpm db:deploy       # aplica migraciones en producción (migrate deploy)
pnpm db:studio       # interfaz gráfica de Prisma
pnpm db:reset        # resetea BD y aplica migraciones (dev)
pnpm prepare         # genera cliente Prisma (ejecutado tras pnpm install)
```

## Documentación

- [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) — visión, arquitectura, modelo de datos,
  API, seguridad, fases y decisiones técnicas (ADRs).
- [`PROGRESS.md`](./PROGRESS.md) — estado actual y próximos pasos (contexto persistente entre
  sesiones).
- [`docs/runbook.md`](./docs/runbook.md) — **operación**: arrancar/actualizar, copias de
  seguridad y restauración, y acceso remoto con Tailscale.

## Acceso remoto y copias de seguridad

- **Host público:** la app se configura con una sola variable, `PUBLIC_HOST` en `.env`
  (`localhost` por defecto). Cambiarla a la dirección/nombre de Tailscale permite entrar
  desde fuera de casa sin abrir puertos ni dominio. Ver §2 del runbook.
- **Copias de seguridad:** `./scripts/backup.sh` genera volcados de MySQL (app) y Postgres
  (Hexclave) en `backups/`, con retención y verificación. Ver §3 del runbook.

## Convenciones de trabajo

- Trabajar **por fases pequeñas**, cada una con un estado funcional verificable.
- Al terminar cada fase: TypeScript, lint, tests y build en verde; actualizar docs y
  `PROGRESS.md`.
- Evitar sobreingeniería: sin microservicios, sin dependencias innecesarias.
- Nunca incluir secretos reales en el repositorio.
