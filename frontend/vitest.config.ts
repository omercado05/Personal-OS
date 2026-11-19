import { defineConfig } from "vitest/config";

// Tests unitarios de lógica pura. Los specs de Playwright (`*.spec.ts`) quedan fuera.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    // Las fechas se agrupan en hora local: se fija la zona para que sea determinista.
    env: { TZ: "America/Bogota" },
  },
});
