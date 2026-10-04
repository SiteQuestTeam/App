const { chromium, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { mkdir } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const cases = [];
const test = (name, run) => cases.push({ name, run });
for (const width of [360, 768, 1440]) {
  test(`${width}px: layout, navigation, demo and accessibility`, async ({
    page,
  }) => {
    const errors = [];
    const failures = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("requestfailed", (request) => failures.push(request.url()));
    page.on("response", (response) => {
      if (response.status() >= 400)
        failures.push(`${response.status()} ${response.url()}`);
    });
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('a[href="#"], a[href*="localhost"]')).toHaveCount(
      0,
    );
    await expect(page.locator("canvas")).toHaveCount(0);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    await mkdir("review", { recursive: true });
    await page.screenshot({
      path: `review/landing-${width}.png`,
      fullPage: true,
    });
    if (overflow.page > overflow.viewport)
      console.log(
        "OVERFLOW",
        await page.locator("body *").evaluateAll((els) =>
          els
            .filter((el) => el.getBoundingClientRect().right > innerWidth)
            .map((el) => ({
              tag: el.tagName,
              cls: el.className,
              right: el.getBoundingClientRect().right,
            }))
            .slice(0, 20),
        ),
      );
    expect(overflow.page).toBeLessThanOrEqual(overflow.viewport);
    // Load all below-the-fold illustrations, then verify original assets.
    for (const img of await page.locator("img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty("complete", true);
      expect(await img.evaluate((el) => el.naturalWidth)).toBeGreaterThan(0);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    if (width <= 900) {
      const menu = page.locator(".menu-button");
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeFocused();
      await menu.click();
      await page
        .locator("#mobile-nav")
        .getByRole("link", { name: "Pomysł czy usterka?" })
        .click();
      await expect(page).toHaveURL(/#dwie-sciezki$/);
      await expect(page.locator("#mobile-nav")).toBeHidden();
    } else {
      await page
        .locator(".desktop-nav")
        .getByRole("link", { name: "Pomysł czy usterka?" })
        .click();
      await expect(page).toHaveURL(/#dwie-sciezki$/);
    }
    const headingTop = await page
      .locator("#paths-title")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(headingTop).toBeGreaterThan(70);
    const cta = page
      .locator(".header")
      .getByRole("button", { name: "Wypróbuj demo" });
    await cta.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Zamknij demo" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => !!document.activeElement.closest("dialog")),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Oddaj głos w demo", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("10/10");
    await expect(page.getByRole("status")).toContainText("nie oznacza");
    await expect(
      page.getByRole("button", { name: "Głos oddany w demo" }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: /Stojak rowerowy przy parku/ })
      .click();
    await page
      .getByRole("button", { name: "Oddaj głos w demo", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: "7 z 10 głosów", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Zresetuj demo/ }).click();
    await expect(
      page.getByRole("img", { name: "6 z 10 głosów", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ścieżka usterki" }).click();
    await expect(
      page.getByText("Wysyłka nie jest jeszcze podpięta.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Wróć do demo inicjatyw" }).click();
    const dialogAudit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(dialogAudit.violations).toEqual([]);
    await mkdir("review", { recursive: true });
    await page.screenshot({ path: `review/demo-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(cta).toBeFocused();
    // Exercise every landing CTA and every section anchor.
    for (const button of await page.locator("main button").all()) {
      await button.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Zamknij demo" }).click();
    }
    for (const href of [
      "#jak-to-dziala",
      "#dwie-sciezki",
      "#aplikacja",
      "#przewodnik",
      "#top",
    ]) {
      const link = page.locator(`a[href="${href}"]:visible`).first();
      if (await link.count()) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(href + "$"));
      }
    }
    await page.evaluate(() => scrollTo(0, 0));
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    const smallTargets = await page
      .locator("a:visible, button:visible")
      .evaluateAll((els) =>
        els
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width < 44 || b.height < 44;
          })
          .map((el) => el.textContent || el.getAttribute("aria-label")),
      );
    expect(smallTargets).toEqual([]);
    await page.screenshot({
      path: `review/landing-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `review/hero-${width}.png` });
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });
}

(async () => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let browser;
  try {
    for (let i = 0; i < 100; i++) {
      try {
        await fetch("http://127.0.0.1:4173");
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--no-zygote", "--single-process"],
    });
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      reducedMotion: "reduce",
    });
    for (const task of cases) {
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      console.log("RUN", task.name);
      await task.run({ page });
      console.log("PASS", task.name);
      await page.close();
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})();
