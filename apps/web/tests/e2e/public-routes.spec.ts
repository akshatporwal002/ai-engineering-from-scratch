import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { settleFiniteMotion } from "./motion";

const routes = [
  { name: "academy", next: "/", legacy: "/index.html" },
  { name: "about", next: "/about", legacy: "/about.html" },
  { name: "credits", next: "/credits", legacy: "/credits.html" },
  { name: "glossary", next: "/glossary", legacy: "/glossary.html" },
  { name: "assurance", next: "/assurance", legacy: "/assurance.html" },
  { name: "catalog", next: "/catalog", legacy: "/catalog.html" },
  { name: "roadmap", next: "/roadmap", legacy: "/prereqs.html" },
  { name: "certifications", next: "/certifications", legacy: "/certifications.html" },
  { name: "certification-track", next: "/certifications/ccao-f", legacy: "/certification.html?id=claude-ccao-f" },
  { name: "cv-analysis", next: "/cv-analysis", legacy: "/cv-analysis.html" },
];

async function keepNavigationLocal(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") await route.continue();
    else await route.abort("blockedbyclient");
  });
}

async function expectNoBlockingAxeFindings(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
}

test.beforeEach(async ({ page }) => keepNavigationLocal(page));

for (const route of routes) {
  test(`${route.name} renders with valid landmarks and accessibility`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("ERR_BLOCKED_BY_CLIENT.Inspector")) errors.push(message.text());
    });
    await page.goto(route.next);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await settleFiniteMotion(page);
    await expectNoBlockingAxeFindings(page);
    expect(errors).toEqual([]);
  });
}

test("legacy and Next Academy corrections pass Axe with normal and reduced motion", async ({ page }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    for (const academyUrl of ["http://127.0.0.1:4173/index.html", "http://127.0.0.1:4174/"]) {
      await page.goto(academyUrl, { waitUntil: "load" });
      if (reducedMotion === "no-preference") await expect(page.locator("body")).toHaveClass(/js-anim/);
      else await expect(page.locator("body")).not.toHaveClass(/js-anim/);
      await settleFiniteMotion(page);
      await expect(page.locator(".books-note a")).toHaveCount(2);
      await expect(page.locator(".books-note a").first()).toHaveCSS("text-decoration-line", "underline");
      await expectNoBlockingAxeFindings(page);
    }
  }
});

for (const route of [
  { name: "about", next: "/about", legacy: "http://127.0.0.1:4173/about.html" },
  { name: "credits", next: "/credits", legacy: "http://127.0.0.1:4173/credits.html" },
  { name: "assurance", next: "/assurance", legacy: "http://127.0.0.1:4173/assurance.html" },
]) {
  test(`${route.name} legacy and Next preserve focus and accessibility across motion preferences`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("ERR_BLOCKED_BY_CLIENT.Inspector")) errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText;
      if ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && failure !== "net::ERR_ABORTED") {
        errors.push(`${request.method()} ${url.pathname}: ${failure}`);
      }
    });
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      await page.emulateMedia({ reducedMotion });
      for (const surface of [
        { url: route.next, hash: "main-content" },
        { url: route.legacy, hash: "main" },
      ]) {
        await page.goto(surface.url);
        await settleFiniteMotion(page);

        const skip = page.getByRole("link", { name: "Skip to content" });
        await skip.focus();
        await expect(skip).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(new RegExp(`#${surface.hash}$`));
        await expect(page.locator(`main#${surface.hash}`)).toBeFocused();

        const footerLink = page.locator(".site-footer a").first();
        await footerLink.focus();
        await expect(footerLink).toBeFocused();
        await expect(footerLink).not.toHaveCSS("outline-style", "none");

        const themeToggle = page.getByRole("button", { name: "Toggle theme" });
        const initialTheme = await page.locator("html").getAttribute("data-theme");
        await themeToggle.click();
        await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "light");
        await themeToggle.click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", initialTheme ?? "light");
        await settleFiniteMotion(page);
        await expectNoBlockingAxeFindings(page);
        expect(errors).toEqual([]);
      }
    }
  });
}

test("catalog and glossary search states are keyboard-operable", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator('.public-explorer[data-hydrated="true"]')).toBeVisible();
  const catalogSearch = page.getByRole("searchbox", { name: "Search lessons" });
  await catalogSearch.fill("Dev Environment");
  await expect(page.getByRole("status")).toContainText("1 of 503 lessons");
  await expect(page.getByRole("heading", { name: "Dev Environment" })).toBeVisible();

  await page.goto("/glossary");
  await expect(page.locator('.public-explorer[data-hydrated="true"]')).toBeVisible();
  const glossarySearch = page.getByRole("searchbox", { name: "Search the glossary" });
  await glossarySearch.fill("training-memory technique");
  await expect(page.getByRole("status")).toContainText("1 of");
  await expect(page.getByRole("heading", { name: "Activation Checkpointing" })).toBeVisible();
});

test("academy phase dialog is keyboard-operable and restores focus", async ({ page }) => {
  await page.goto("/");
  const firstPhase = page.getByRole("button", { name: /Open Phase 00:/ });
  await firstPhase.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: /Setup & Tooling/i });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close phase details" })).toBeFocused();
  await expect(dialog.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(firstPhase).toBeFocused();
});

test("academy local progress updates without creating external state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Open Phase 00:/ }).click();
  const markDone = page.getByRole("button", { name: "Mark complete" }).first();
  await markDone.click();
  await expect(page.getByRole("button", { name: "Mark as not done" }).first()).toBeVisible();
  expect(await page.evaluate(() => Boolean(localStorage.getItem("aifs:progress:v1")))).toBe(true);
});

test("legacy inbound paths redirect to public routes", async ({ page }) => {
  for (const [legacy, destination] of [
    ["/index.html", "/"],
    ["/catalog.html", "/catalog"],
    ["/glossary.html", "/glossary"],
    ["/prereqs.html", "/roadmap"],
    ["/certifications.html", "/certifications"],
    ["/cv-analysis.html", "/cv-analysis"],
  ]) {
    await page.goto(legacy);
    expect(new URL(page.url()).pathname).toBe(destination);
  }
  await page.goto("/certification.html?id=claude-ccao-f");
  expect(new URL(page.url()).pathname).toBe("/certifications/ccao-f");
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  for (const route of routes) {
    test(`${route.name} ${viewport.name} layout has no overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`http://127.0.0.1:4174${route.next}`);
      const explorer = page.locator('.public-explorer[data-hydrated="true"]');
      if (await explorer.count()) await expect(explorer).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}
