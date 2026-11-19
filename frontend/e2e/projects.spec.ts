import { expect, test } from "@playwright/test";

import { deleteFromDetail, uniqueName } from "./helpers";

test("Projects: crear, editar, filtrar y eliminar un proyecto", async ({ page }) => {
  const name = uniqueName("Proyecto de prueba");
  const edited = `${name} editado`;

  await page.goto("/projects/new");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Estado").selectOption("in_progress");
  await page.getByLabel("Descripción").fill("Proyecto creado por el test e2e.");
  await page.getByRole("button", { name: "Crear proyecto" }).click();

  await expect(page).toHaveURL(/\/projects\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await page.getByRole("link", { name: "Editar proyecto" }).click();
  await page.getByLabel("Nombre").fill(edited);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: edited })).toBeVisible();
  const detailUrl = page.url();

  await page.goto("/projects");
  await page.getByLabel("Buscar proyectos").fill(edited);
  await expect(page.getByRole("link", { name: edited })).toBeVisible();

  await page.goto(detailUrl);
  await deleteFromDetail(page, "Eliminar proyecto");
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByLabel("Buscar proyectos").fill(edited);
  await expect(page.getByRole("link", { name: edited })).toHaveCount(0);
});
