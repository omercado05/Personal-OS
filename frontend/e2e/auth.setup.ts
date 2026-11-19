import { expect, test as setup } from "@playwright/test";

import { AUTH_FILE } from "../playwright.config";
import { credentials } from "./helpers";

// Inicia sesión una vez con el usuario de prueba y guarda la sesión para el
// resto de tests.
setup("iniciar sesión con el usuario de prueba", async ({ page }) => {
  const { email, password } = credentials();
  await page.goto("/handler/sign-in");
  await page.getByLabel(/email|correo/i).fill(email);
  await page.getByLabel(/password|contraseña/i).fill(password);
  await page.getByRole("button", { name: /sign in|iniciar sesión|entrar/i }).click();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /hola/i })).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
