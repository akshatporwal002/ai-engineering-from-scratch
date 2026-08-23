import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const consoleErrors = new WeakMap<Page, string[]>();

async function keepNavigationLocal(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") await route.continue();
    else await route.abort("blockedbyclient");
  });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await keepNavigationLocal(page);
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page)).toEqual([]);
});

test("component showcase has no serious or critical axe findings", async ({ page }) => {
  await page.goto("/components");
  await expect(page.locator("#main-content")).toHaveAttribute("data-hydrated", "true");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
});

test("dialog and dropdown contain and restore keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components");
  await expect(page.locator("#main-content")).toHaveAttribute("data-hydrated", "true");
  const dialogTrigger = page.getByRole("button", { name: "Open dialog" });
  await dialogTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Confirm local fixture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close dialog" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Confirm fixture" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialogTrigger).toBeFocused();

  const menuTrigger = page.getByRole("button", { name: /open menu/i });
  await menuTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "View pathway" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Close preview" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toBeFocused();
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`${viewport.name} component layouts have no overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto("http://127.0.0.1:4173/index.html");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto("http://127.0.0.1:4174/components");
    consoleErrors.get(page)?.splice(0);
    await expect(page.locator("#main-content")).toHaveAttribute("data-hydrated", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (viewport.name === "mobile") {
      const navigation = page.getByRole("navigation", { name: "Primary" });
      await expect(navigation).toBeHidden();
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await expect(navigation).toBeVisible();
      const links = navigation.getByRole("link");
      expect(await links.count()).toBe(5);
      for (const link of await links.all()) {
        const box = await link.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
