import { expect, test, type Page } from "@playwright/test";

import { AUTH_FILE } from "../playwright.config";
import { deleteFromDetail, RUN_ID, uniqueName } from "./helpers";

/** Crea una entrada de Knowledge y devuelve la URL de su detalle. */
async function createEntry(page: Page, title: string): Promise<string> {
  await page.goto("/knowledge/new");
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Categoría").selectOption("Other");
  await page.getByRole("button", { name: "Crear entrada" }).click();
  await expect(page).toHaveURL(/\/knowledge\/\d+$/);
  return page.url();
}

/** Escribe en la búsqueda global y devuelve el contenedor de resultados. */
async function globalSearch(page: Page, query: string) {
  await page.goto("/dashboard");
  await page.getByLabel("Buscar", { exact: true }).fill(query);
  const results = page.locator(".search__results");
  await expect(results.getByText("Buscando…")).toHaveCount(0);
  return results;
}

test.describe("Búsqueda global", () => {
  const created: { url: string; deleteButton: string }[] = [];

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: AUTH_FILE });
    for (const item of created) {
      await page.goto(item.url);
      await deleteFromDetail(page, item.deleteButton);
    }
    await page.close();
  });

  test("encuentra varias palabras en cualquier orden, sin tildes y con ñ", async ({ page }) => {
    const backup = uniqueName("Backup diario con Docker");
    const cafe = uniqueName("Café de especialidad");
    const anio = uniqueName("Propósitos de año nuevo");
    for (const title of [backup, cafe, anio]) {
      created.push({ url: await createEntry(page, title), deleteButton: "Eliminar entrada" });
    }

    let results = await globalSearch(page, `docker ${RUN_ID} backup`);
    await expect(results.getByRole("link", { name: new RegExp(backup) })).toBeVisible();

    results = await globalSearch(page, `${RUN_ID} cafe`);
    await expect(results.getByRole("link", { name: new RegExp(cafe) })).toBeVisible();

    results = await globalSearch(page, `${RUN_ID} año`);
    await expect(results.getByRole("link", { name: new RegExp(anio) })).toBeVisible();

    results = await globalSearch(page, `${RUN_ID} ano`);
    await expect(results.getByText("Sin resultados.")).toBeVisible();
  });

  test("incluye tareas con su estado y abre su detalle", async ({ page }) => {
    const title = uniqueName("Pagar la luz");
    await page.goto("/tasks/new");
    await page.getByLabel("Título").fill(title);
    await page.getByRole("button", { name: "Crear tarea" }).click();
    await expect(page).toHaveURL(/\/tasks$/);

    const results = await globalSearch(page, `luz ${RUN_ID}`);
    const link = results.getByRole("link", { name: new RegExp(title) });
    await expect(link).toContainText("Tarea");
    await expect(link).toContainText("Pendiente");
    await link.click();
    await expect(page).toHaveURL(/\/tasks\/\d+$/);
    created.push({ url: page.url(), deleteButton: "Eliminar tarea" });
  });
});
