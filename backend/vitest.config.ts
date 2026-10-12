import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    // Entorno determinista para los tests: no dependemos del `.env` real ni de
    // una base de datos en marcha (los tests inyectan sus propias dependencias).
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: "mysql://test:test@127.0.0.1:3306/personal_os_test",
    },
  },
});
