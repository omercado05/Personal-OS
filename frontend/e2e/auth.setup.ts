import { test as setup } from "@playwright/test";

import { AUTH_FILE } from "../playwright.config";
import { signIn } from "./helpers";

// Inicia sesión una vez con el usuario de prueba y guarda la sesión para el
// resto de tests.
setup("iniciar sesión con el usuario de prueba", async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: AUTH_FILE });
});
