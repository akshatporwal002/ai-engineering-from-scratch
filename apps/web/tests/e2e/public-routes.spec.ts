import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const evidenceDirectory = "../../docs/migration-evidence/overnight/visual";
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

test.beforeEach(async ({ page }) => keepNavigationLocal(page));

for (const route of routes) {
  test(`${route.name} renders with valid landmarks and accessibility`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(route.next);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("catalog and glossary search states are keyboard-operable", async ({ page }) => {
  await page.goto("/catalog");
  const catalogSearch = page.getByRole("searchbox", { name: "Search lessons" });
  await catalogSearch.fill("Dev Environment");
  await expect(page.getByRole("status")).toContainText("1 of 503 lessons");
  await expect(page.getByRole("heading", { name: "Dev Environment" })).toBeVisible();

  await page.goto("/glossary");
  const glossarySearch = page.getByRole("searchbox", { name: "Search the glossary" });
  await glossarySearch.fill("training-memory technique");
  await expect(page.getByRole("status")).toContainText("1 of");
  await expect(page.getByRole("heading", { name: "Activation Checkpointing" })).toBeVisible();
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
    test(`${route.name} paired ${viewport.name} evidence has no overflow`, async ({ page }) => {
      let errors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`http://127.0.0.1:4173${route.legacy}`);
      await page.screenshot({ path: `${evidenceDirectory}/workstream-3-${route.name}-legacy-${viewport.name}.png` });

      errors = [];
      await page.goto(`http://127.0.0.1:4174${route.next}`);
      const explorer = page.locator('.public-explorer[data-hydrated="true"]');
      if (await explorer.count()) await expect(explorer).toBeVisible();
      await page.screenshot({ path: `${evidenceDirectory}/workstream-3-${route.name}-next-${viewport.name}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}
