import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Tests e2e contra el stack local de Docker (no van en el CI). Las credenciales
// del usuario de prueba (E2E_USER_EMAIL / E2E_USER_PASSWORD) se leen del .env
// de la raíz, que no se versiona.
const rootEnv = path.resolve(__dirname, "../.env");
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

export const AUTH_FILE = path.join(__dirname, "playwright/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  // Borra los datos de prueba aunque algún test falle a medias.
  globalTeardown: "./e2e/global-teardown.ts",
  // Los tests comparten un único usuario de prueba: en serie, sin interferencias.
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "es-ES",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
  ],
});
