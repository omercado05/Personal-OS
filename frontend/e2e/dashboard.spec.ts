import { expect, test } from "@playwright/test";

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
