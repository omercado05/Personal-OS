import { expect, test } from "@playwright/test";

import { deleteFromDetail, uniqueName } from "./helpers";

test("Knowledge: crear, editar, filtrar y eliminar una entrada", async ({ page }) => {
  const title = uniqueName("Nota de prueba");
  const edited = `${title} editada`;

  await page.goto("/knowledge/new");
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Categoría").selectOption("Linux");
  await page.getByLabel("Contenido").fill("Contenido escrito por el test e2e.");
  await page.getByRole("button", { name: "Crear entrada" }).click();

  await expect(page).toHaveURL(/\/knowledge\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.getByRole("link", { name: "Editar entrada" }).click();
  await page.getByLabel("Título").fill(edited);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: edited })).toBeVisible();
  const detailUrl = page.url();

  await page.goto("/knowledge");
  await page.getByLabel("Buscar entradas").fill(edited);
  await expect(page.getByRole("link", { name: edited })).toBeVisible();

  await page.goto(detailUrl);
  await deleteFromDetail(page, "Eliminar entrada");
  await expect(page).toHaveURL(/\/knowledge$/);
  await page.getByLabel("Buscar entradas").fill(edited);
  await expect(page.getByRole("link", { name: edited })).toHaveCount(0);
});
