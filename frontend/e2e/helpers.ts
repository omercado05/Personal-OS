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

/** Pulsa el botón de eliminar del detalle y confirma en el diálogo. */
export async function deleteFromDetail(page: Page, buttonName: string): Promise<void> {
  await page.getByRole("button", { name: buttonName }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Eliminar" }).click();
}
