import { expect, test } from "@playwright/test";

import { deleteFromDetail, uniqueName } from "./helpers";

test("Tasks: crear, completar, reabrir y eliminar una tarea", async ({ page }) => {
  const title = uniqueName("Tarea de prueba");

  await page.goto("/tasks/new");
  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Prioridad").selectOption("HIGH");
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  await page.getByLabel("Buscar tareas").fill(title);
  await page.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);

  await page.getByRole("button", { name: "Marcar completada" }).click();
  await expect(page.getByRole("button", { name: "Marcar pendiente" })).toBeVisible();
  await page.getByRole("button", { name: "Marcar pendiente" }).click();
  await expect(page.getByRole("button", { name: "Marcar completada" })).toBeVisible();

  await deleteFromDetail(page, "Eliminar tarea");
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByLabel("Buscar tareas").fill(title);
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});
