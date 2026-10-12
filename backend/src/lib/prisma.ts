import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Cliente Prisma (singleton).
 *
 * Prisma 7 es "Rust-free": en lugar del motor de consultas nativo usa un
 * *driver adapter*. Para MySQL el adaptador disponible es el de MariaDB, que
 * habla el mismo protocolo y funciona contra MySQL 8.
 *
 * MySQL 8.4 usa `caching_sha2_password` por defecto. Sin TLS, el driver necesita
 * `allowPublicKeyRetrieval` para completar la autenticación la primera vez.
 * Es aceptable sobre redes privadas (localhost / red de Docker); con TLS no hace
 * falta. En la Fase 9 se revisará para producción.
 *
 * Se importa el cliente desde la carpeta generada (`src/generated/prisma`), que
 * se regenera con `pnpm db:generate` (o automáticamente antes de build/test).
 */
const databaseUrl = new URL(env.databaseUrl);
databaseUrl.searchParams.set("allowPublicKeyRetrieval", "true");

const adapter = new PrismaMariaDb(databaseUrl.toString());

export const prisma = new PrismaClient({ adapter });
