/**
 * Lectura y validación temprana de variables de entorno con Zod.
 *
 * Se ejecuta al importar este módulo: si la configuración es inválida, el proceso
 * falla inmediatamente con un mensaje claro, en lugar de fallar más tarde y de
 * forma confusa.
 *
 * En desarrollo cargamos `.env` desde `backend/` o desde la raíz del repositorio
 * (donde vive el `.env` real). En Docker las variables las inyecta Compose, así
 * que la ausencia de `.env` es válida.
 */

import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: [".env", "../.env"], quiet: true });

/** Trata la cadena vacía como variable ausente (en `.env` las variables sin valor quedan vacías). */
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Servidor HTTP
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_VERSION: z.string().min(1).default("0.1.0"),

  // Logging (pino)
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Base de datos (Prisma)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL es obligatoria")
    .refine((value) => value.startsWith("mysql://"), {
      message: "DATABASE_URL debe usar el esquema mysql://",
    }),

  // CORS
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),

  // Autenticación (Hexclave). La verificación de JWT se activa cuando se puede
  // resolver la terna jwksUrl/issuer/audience (explícita o derivada del
  // project ID + URLs de la API).
  HEXCLAVE_API_URL: optionalUrl,
  HEXCLAVE_INTERNAL_API_URL: optionalUrl,
  HEXCLAVE_PROJECT_ID: optionalString,
  HEXCLAVE_PUBLISHABLE_CLIENT_KEY: optionalString,
  HEXCLAVE_SECRET_SERVER_KEY: optionalString,
  // JWKS accesible desde el backend (en Docker, el hostname interno).
  HEXCLAVE_JWKS_URL: optionalUrl,
  // `iss` esperado en el token (URL pública del proyecto).
  HEXCLAVE_ISSUER: optionalString,
  // `aud` esperado en el token (identificador del proyecto).
  HEXCLAVE_AUDIENCE: optionalString,
});

export type NodeEnv = z.infer<typeof envSchema>["NODE_ENV"];

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
    .join("\n");
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Configuración de entorno inválida:\n${formatIssues(parsed.error)}`);
}

const raw = parsed.data;

export const env = {
  nodeEnv: raw.NODE_ENV,
  host: raw.HOST,
  port: raw.PORT,
  appVersion: raw.APP_VERSION,
  logLevel: raw.LOG_LEVEL,
  databaseUrl: raw.DATABASE_URL,
  corsOrigin: raw.CORS_ORIGIN,
  hexclave: {
    apiUrl: raw.HEXCLAVE_API_URL,
    internalApiUrl: raw.HEXCLAVE_INTERNAL_API_URL,
    projectId: raw.HEXCLAVE_PROJECT_ID,
    publishableClientKey: raw.HEXCLAVE_PUBLISHABLE_CLIENT_KEY,
    secretServerKey: raw.HEXCLAVE_SECRET_SERVER_KEY,
    jwksUrl: raw.HEXCLAVE_JWKS_URL,
    issuer: raw.HEXCLAVE_ISSUER,
    audience: raw.HEXCLAVE_AUDIENCE,
  },
} as const;

export type Env = typeof env;
