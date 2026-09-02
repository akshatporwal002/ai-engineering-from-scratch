import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { settleFiniteMotion } from "./motion";

async function keepNavigationLocal(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") await route.continue();
    else await route.abort("blockedbyclient");
  });
}

test.beforeEach(async ({ page }) => keepNavigationLocal(page));

test("mobile navigation opens from keyboard and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: "Open navigation" });
  const navigation = page.getByRole("navigation", { name: "Primary" });
  await expect(navigation).toBeHidden();
  expect(await page.locator(".site-header").boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 57 });
  expect(await page.locator(".header-inner").boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 56 });
  await toggle.focus();
  await page.keyboard.press("ArrowDown");
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link")).toHaveCount(7);
  await expect(navigation.getByRole("link").first()).toBeFocused();
  await expect(navigation.getByRole("button", { name: /Search/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("skip link and command-palette keyboard selection work", async ({ page }) => {
  await page.goto("/");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);

  await page.keyboard.press("Meta+k");
  const searchbox = page.getByRole("combobox", { name: "Search" });
  await searchbox.fill("Optimization");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lessons\/01-math-foundations\/08-optimization$/);
});

test("desktop shell matches navigation, theme, search, login, and accessibility contracts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Primary" });
  await expect(navigation.getByRole("link")).toHaveText(["Academy", "Catalog", "Skill map", "CV Analysis", "Glossary", "About", "Credits"]);
  await expect(navigation.getByRole("link", { name: "Academy" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".site-header")).toHaveCSS("position", "fixed");
  await expect(page.locator(".header-inner")).toHaveCSS("height", "64px");
  expect(await page.locator(".site-header").boundingBox()).toEqual({ x: 0, y: 0, width: 1440, height: 65 });
  expect(await page.locator(".header-inner").boundingBox()).toEqual({ x: 120, y: 0, width: 1200, height: 64 });

  const theme = page.getByRole("button", { name: "Toggle theme" });
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const search = page.getByRole("button", { name: /Search/ });
  await search.focus();
  await page.keyboard.press("Meta+k");
  const searchbox = page.getByRole("combobox", { name: "Search" });
  await expect(searchbox).toBeFocused();
  await searchbox.fill("Optimization");
  await expect(page.getByRole("option", { name: /Optimization/ }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();

  const login = page.getByRole("button", { name: "Log in to Codeology" });
  await login.click();
  await expect(page.getByRole("dialog", { name: "Keep your progress." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close login" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(login).toBeFocused();

  await settleFiniteMotion(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
