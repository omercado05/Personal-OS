/**
 * Lectura y validación temprana de variables de entorno.
 *
 * Fase 1: subconjunto mínimo (servidor + logging). En la Fase 2 se integrará Zod
 * para validar el esquema completo (base de datos, autenticación, etc.).
 */

export type NodeEnv = "development" | "test" | "production";

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function readPort(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`La variable ${name} debe ser un puerto válido (recibido: "${raw}").`);
  }
  return value;
}

function readNodeEnv(): NodeEnv {
  const value = process.env.NODE_ENV ?? "development";
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }
  throw new Error(`NODE_ENV inválido: "${value}".`);
}

export const env = {
  nodeEnv: readNodeEnv(),
  host: readString("HOST", "0.0.0.0"),
  port: readPort("PORT", 4000),
  logLevel: readString("LOG_LEVEL", "info"),
  appVersion: readString("APP_VERSION", "0.1.0"),
} as const;
