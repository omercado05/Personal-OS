# Personal OS

[![CI](https://github.com/omercado05/Personal-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/omercado05/Personal-OS/actions/workflows/ci.yml)

Aplicación web personal y privada para organizar en un solo sitio **conocimiento, proyectos y
tareas**. Está pensada para una sola persona, se autoaloja con Docker y se puede usar desde
fuera de casa a través de Tailscale, sin abrir puertos ni contratar dominio.

## Funcionalidades

- **Dashboard** — resumen de lo último que has creado o editado, métricas (entradas por
  categoría, proyectos por estado, actividad de los últimos meses) y un calendario con las
  tareas que vencen hoy y las vencidas.
- **Knowledge** — apuntes y notas con categorías (Programming, Linux, Networking, Databases,
  University, Coffee, Ideas, Projects, Other) y etiquetas libres. Filtros por categoría,
  etiqueta y texto.
- **Projects** — proyectos con estado (idea, planning, in progress, paused, completed,
  archived), descripción, URL y tecnologías.
- **Tasks** — tareas con fecha de vencimiento, prioridad (baja, media, alta) y vínculo
  opcional a un proyecto. Se agrupan por día según tu zona horaria.
- **Búsqueda global** — busca a la vez en conocimiento, proyectos y tareas (títulos, contenido,
  etiquetas y tecnologías) desde la barra superior.
- **Cuenta y seguridad** — inicio de sesión con Hexclave
  autoalojado; cada usuario solo ve sus propios datos. La API aplica límite de peticiones y
  cabeceras de seguridad.
- **Interfaz** — tema oscuro «Aurora viva»: aurora animada de fondo, superficies de cristal con
  haz de luz, líneas de tiempo en listados y dashboard como relato con scroll. Adaptada a móvil,
  tablet y escritorio, respeta el movimiento reducido y es accesible con teclado y lector de
  pantalla.

## Stack

| Capa            | Tecnología                                                 |
| --------------- | ---------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router), React 19, TypeScript              |
| Backend         | Node.js 24, Fastify 5, TypeScript, validación con Zod      |
| Base de datos   | MySQL 8.4 con Prisma 7 (`@prisma/adapter-mariadb`)         |
| Autenticación   | Hexclave self-hosted (Postgres + ClickHouse), JWT con JWKS |
| Infraestructura | Docker + Docker Compose, pnpm 12                           |
| Calidad         | Vitest, ESLint, Prettier y CI en GitHub Actions            |

## Arquitectura

```text
Navegador ──► frontend (Next.js :3000) ──REST /api/v1──► backend (Fastify :4000) ──► MySQL
     │                                                        │
     └────────── login ──► Hexclave (:8102) ◄── verifica JWT ─┘
                              └─► Postgres + ClickHouse
```

Frontend y backend son proyectos independientes (cada uno con su `package.json`) y solo se
comunican por la API REST. El backend sigue capas `routes → controllers → services →
repositories` y filtra todos los datos por el usuario autenticado.

```text
/
├─ frontend/            # App Next.js
├─ backend/             # API Fastify + Prisma (schema y migraciones en prisma/)
├─ docker/              # Ficheros de apoyo de los contenedores
├─ scripts/            # Backups de MySQL y Postgres, con copia cifrada externa
├─ docs/runbook.md      # Guía de operación
├─ docker-compose.yml   # Stack completo (6 servicios)
└─ .env.example         # Todas las variables, con valores de ejemplo
```

## Puesta en marcha

### Requisitos

- Docker con Docker Compose (en Windows, Docker Desktop con WSL2).
- Para desarrollar fuera de Docker: Node 24 y pnpm 12 (`npm install -g pnpm@12`).

### 1. Variables de entorno

```bash
cp .env.example .env
```

Cambia en `.env` las contraseñas y los secretos de Hexclave. Para generarlos:

```bash
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='   # STACK_SERVER_SECRET
openssl rand -hex 32                                  # CRON_SECRET y claves internas
```

### 2a. Todo en Docker

```bash
docker compose up --build
```

La primera vez, Hexclave aplica sus migraciones y crea el usuario administrador; puede tardar
unos minutos en estar listo.

### 2b. Desarrollo con recarga en caliente

La infraestructura en contenedores y las aplicaciones con `pnpm dev`:

```bash
docker compose up -d mysql postgres clickhouse hexclave-server
cd backend && pnpm install && pnpm dev    # http://localhost:4000
cd frontend && pnpm install && pnpm dev   # http://localhost:3000
```

Fuera de Docker, el frontend no lee el `.env` de la raíz: crea `frontend/.env.local` con
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HEXCLAVE_API_URL`, `NEXT_PUBLIC_HEXCLAVE_PROJECT_ID` y
`NEXT_PUBLIC_HEXCLAVE_PUBLISHABLE_CLIENT_KEY` (los comentarios de `.env.example` explican de
dónde sale cada una).

### Servicios

| Servicio              | Dirección             | Notas                                             |
| --------------------- | --------------------- | ------------------------------------------------- |
| Frontend              | http://localhost:3000 | La aplicación                                     |
| Backend               | http://localhost:4000 | `GET /api/v1/health` · `GET /api/v1/health/ready` |
| Hexclave (panel)      | http://localhost:8101 | Administración de usuarios                        |
| Hexclave (API)        | http://localhost:8102 | Usada por frontend y backend                      |
| MySQL                 | 127.0.0.1:3306        | Solo accesible desde el propio equipo             |
| Postgres / ClickHouse | —                     | Solo en la red interna de Docker                  |

## API

Todas las rutas cuelgan de `/api/v1`, devuelven JSON y, salvo `health`, exigen un token de
Hexclave (`Authorization: Bearer …`).

| Recurso   | Rutas                                                                     |
| --------- | ------------------------------------------------------------------------- |
| Salud     | `GET /health`, `GET /health/ready`                                        |
| Usuario   | `GET /me`                                                                 |
| Knowledge | `GET/POST /knowledge`, `GET/PUT/DELETE /knowledge/:id`, `GET /tags`       |
| Projects  | `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`                      |
| Tasks     | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/:id/toggle` |
| Búsqueda  | `GET /search?q=&type=all\|knowledge\|projects\|tasks&page=&pageSize=`     |
| Dashboard | `GET /dashboard`, `GET /dashboard/metrics?tz=`                            |

## Desarrollo

Comandos disponibles en `backend/` y `frontend/`:

```bash
pnpm dev            # servidor de desarrollo
pnpm build          # build de producción
pnpm typecheck      # comprobación de tipos
pnpm lint           # ESLint
pnpm format:check   # Prettier
pnpm test           # tests (solo backend, con Vitest)
```

Solo en `backend/`, para la base de datos:

```bash
pnpm db:migrate     # crea y aplica migraciones (desarrollo)
pnpm db:deploy      # aplica migraciones pendientes
pnpm db:studio      # explorador visual de Prisma
```

Cada push a `main` y cada pull request ejecutan en GitHub Actions el formato, el lint, los
tipos, los tests y el build de ambos proyectos.

### Tests end-to-end (Playwright)

`frontend/e2e/` recorre la app en un navegador real contra el stack local de Docker: login y
logout, crear/editar/filtrar/borrar en Knowledge, Projects y Tasks, y la búsqueda global. No
se ejecutan en el CI (necesitan Hexclave en marcha).

1. Crea en Hexclave (http://localhost:8101, proyecto de la app) un usuario de prueba con email
   y contraseña, y añádelo al `.env` de la raíz como `E2E_USER_EMAIL` y `E2E_USER_PASSWORD`.
2. La primera vez, instala el navegador y sus dependencias del sistema:

   ```bash
   cd frontend
   pnpm exec playwright install chromium
   sudo env "PATH=$PATH" pnpm exec playwright install-deps chromium
   ```

3. Con el stack levantado: `cd frontend && pnpm test:e2e`.

Los datos que crean llevan el prefijo `e2e-` y se borran al terminar, aunque algún test falle.
La API limita las escrituras a 60 por minuto: si repites la suite varias veces seguidas, espera
un minuto entre ejecuciones.

## Operación

[`docs/runbook.md`](./docs/runbook.md) explica cómo arrancar y actualizar la aplicación,
configurar el acceso remoto con Tailscale (`PUBLIC_HOST`), y hacer y restaurar copias de
seguridad con `scripts/backup.sh`, que además deja una copia cifrada (gpg, AES-256)
fuera del equipo, por ejemplo en una carpeta sincronizada con OneDrive.

## Licencia

[Apache License 2.0](./LICENSE).
