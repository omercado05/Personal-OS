// Configuración de la CLI de Prisma (Prisma 7).
// Reemplaza al antiguo bloque `prisma` de package.json y a la carga implícita de .env.
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
//
// La CLI se ejecuta normalmente desde `backend/`, mientras que el `.env` real del
// proyecto vive en la raíz del repositorio. Por eso cargamos ambos con dotenv.

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ["../.env", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` no necesita una base de datos real; el fallback evita
    // fallar durante el build de Docker cuando aún no hay DATABASE_URL.
    url: process.env.DATABASE_URL ?? "mysql://user:password@localhost:3306/personal_os",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
