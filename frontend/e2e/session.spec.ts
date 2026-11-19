import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

// Sesión propia (sin la compartida): cerrar sesión aquí no afecta a los demás tests.
test.use({ storageState: { cookies: [], origins: [] } });

test("sin sesión se pide iniciar sesión; con login se entra y se puede salir", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();

  await signIn(page);

  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  // Hexclave cierra la sesión en /handler/sign-out y vuelve a la página de origen.
  await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
});
