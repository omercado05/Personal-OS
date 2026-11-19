import { expect, test } from "@playwright/test";

import { credentials } from "./helpers";

// Sesión propia (sin la compartida): cerrar sesión aquí no afecta a los demás tests.
test.use({ storageState: { cookies: [], origins: [] } });

test("sin sesión se pide iniciar sesión; con login se entra y se puede salir", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();

  const { email, password } = credentials();
  await page.goto("/handler/sign-in");
  await page.getByLabel(/email|correo/i).fill(email);
  await page.getByLabel(/password|contraseña/i).fill(password);
  await page.getByRole("button", { name: /sign in|iniciar sesión|entrar/i }).click();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /hola/i })).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
});
