import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    // Entorno determinista para los tests: no dependemos del `.env` real ni de
    // una base de datos en marcha (los tests inyectan sus propias dependencias).
    // Se definen también las variables de Hexclave para que `buildApp()` resuelva
    // una configuración de auth completa sin leer el `.env` del desarrollador.
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: "mysql://test:test@127.0.0.1:3306/personal_os_test",
      HEXCLAVE_API_URL: "http://localhost:8102",
      HEXCLAVE_INTERNAL_API_URL: "http://hexclave-server:8102",
      HEXCLAVE_PROJECT_ID: "test-project",
      HEXCLAVE_ISSUER: "http://localhost:8102/api/v1/projects/test-project",
      HEXCLAVE_AUDIENCE: "test-project",
      HEXCLAVE_JWKS_URL: "http://localhost:8102/api/v1/projects/test-project/.well-known/jwks.json",
    },
  },
});
