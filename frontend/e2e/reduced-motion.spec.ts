import { expect, test } from "@playwright/test";

// Con prefers-reduced-motion nada visible dentro de `main` debe quedar con
// opacidad 0 (p. ej. un Reveal que no respeta la reducción de movimiento).
test.use({ reducedMotion: "reduce" });

for (const route of ["/dashboard", "/knowledge", "/projects", "/tasks"]) {
  test(`Movimiento reducido: ${route} no deja elementos invisibles`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main .skeleton")).toHaveCount(0);

    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
          return inViewport && rect.height > 0 && getComputedStyle(el).opacity === "0";
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    );

    expect(hidden).toEqual([]);
  });
}
