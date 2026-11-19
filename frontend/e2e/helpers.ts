import { expect, type Page } from "@playwright/test";

/** Prefijo único por ejecución: identifica (y permite limpiar) los datos de prueba. */
export const RUN_ID = `e2e-${Date.now().toString(36)}`;

/** Nombre único para un elemento creado por un test. */
export function uniqueName(label: string): string {
  return `${RUN_ID} ${label}`;
}

/** Credenciales del usuario de prueba; sin ellas los tests no pueden ejecutarse. */
export function credentials(): { email: string; password: string } {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("Faltan E2E_USER_EMAIL y E2E_USER_PASSWORD en el .env de la raíz.");
  }
  return { email, password };
}

/** Pulsa «Eliminar» en el detalle y confirma en el diálogo. */
export async function deleteFromDetail(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Eliminar", exact: true }).click();
}

/** Inicia sesión con email y contraseña en el formulario de Hexclave. */
export async function signIn(page: Page): Promise<void> {
  const { email, password } = credentials();
  await page.goto("/handler/sign-in");
  await page.getByRole("tab", { name: "Correo y contraseña" }).click();
  const panel = page.getByRole("tabpanel", { name: "Correo y contraseña" });
  await panel.getByRole("textbox", { name: "Correo electrónico" }).fill(email);
  await panel.getByLabel("Contraseña", { exact: true }).fill(password);
  await panel.getByRole("button", { name: "Iniciar sesión" }).click();
  // El SDK redirige tras guardar la sesión. Es una navegación del lado del
  // cliente: se espera al cambio de URL ("commit"), no al evento load.
  await page.waitForURL((url) => !url.pathname.startsWith("/handler/sign-in"), {
    waitUntil: "commit",
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: /hola/i })).toBeVisible();
}
