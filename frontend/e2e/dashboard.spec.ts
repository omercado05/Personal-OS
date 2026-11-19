import { expect, test } from "@playwright/test";

import { deleteFromDetail, uniqueName } from "./helpers";

const BAND_HEADINGS = ["Hoy", "Tus cifras", "Actividad", "Proyectos y conocimiento", "Reciente"];

test("Dashboard: bandas del relato con scroll", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { level: 1, name: /hola/i })).toBeVisible();
  for (const name of BAND_HEADINGS) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toHaveCount(1);
  }
});

test.describe("Dashboard en móvil", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("Dashboard: sin desplazamiento horizontal a 375 px", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 2, name: "Reciente", exact: true }),
    ).toHaveCount(1);
    await expect(page.locator("main .skeleton")).toHaveCount(0);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});

test.describe("Dashboard: cifras al revelarse", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });

  test("Dashboard: «Tus cifras» cuenta al verse la banda, no al cargar", async ({ page }) => {
    // Nota temporal para que el total de entradas sea al menos 1.
    await page.goto("/knowledge/new");
    await page.getByLabel("Título").fill(uniqueName("Nota para las cifras"));
    await page.getByLabel("Categoría").selectOption("Linux");
    await page.getByLabel("Contenido").fill("Nota temporal del test e2e de cifras.");
    await page.getByRole("button", { name: "Crear entrada" }).click();
    await expect(page).toHaveURL(/\/knowledge\/\d+$/);
    const noteUrl = page.url();

    const metricsResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/dashboard/metrics"),
    );
    await page.goto("/dashboard");
    const metrics = (await (await metricsResponse).json()) as {
      data: { totals: { knowledge: number } };
    };
    const total = metrics.data.totals.knowledge;
    expect(total).toBeGreaterThanOrEqual(1);

    const value = page.locator(".stat-card", { hasText: "Entradas" }).locator(".stat-card__value");
    await expect(value).toHaveCount(1);
    // La banda está bajo el pliegue: aún no ha contado.
    await page.waitForTimeout(1500);
    await expect(value).toHaveText("0");

    await page
      .getByRole("heading", { level: 2, name: "Tus cifras", exact: true })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await expect(value).toHaveText(total.toLocaleString("es"));

    await page.goto(noteUrl);
    await deleteFromDetail(page);
    await expect(page).toHaveURL(/\/knowledge$/);
  });
});
