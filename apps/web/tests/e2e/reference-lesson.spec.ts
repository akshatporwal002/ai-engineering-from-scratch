import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const evidenceDirectory = "../../docs/migration-evidence/overnight/visual";
const repositoryRoot = path.resolve(process.cwd(), "../..");
const lessonPath = "phases/01-math-foundations/08-optimization";
const legacyUrl = `http://127.0.0.1:4173/lesson.html?path=${lessonPath}`;
const nextUrl = "http://127.0.0.1:4174/lessons/01-math-foundations/08-optimization";
const markdown = readFileSync(path.join(repositoryRoot, lessonPath, "docs/en.md"), "utf8");
const quiz = readFileSync(path.join(repositoryRoot, lessonPath, "quiz.json"), "utf8");

async function isolateLesson(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") await route.continue();
    else await route.abort("blockedbyclient");
  });
  await page.route(`**/${lessonPath}/docs/en.md`, (route) => route.fulfill({ status: 200, contentType: "text/markdown", body: markdown }));
  await page.route(`**/${lessonPath}/quiz.json`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: quiz }));
}

test.beforeEach(async ({ page }) => isolateLesson(page));

test("reference lesson is accessible and exposes every reader mechanism", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(nextUrl);
  await expect(page.locator('.lesson-quiz[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
  await expect(page.locator(".lesson-code")).toHaveCount(11);
  await expect(page.getByRole("img", { name: /Diagram flow/ })).toHaveCount(5);
  await expect(page.getByRole("figure", { name: "Interactive figure: gradient-descent" }).locator('input[type="range"]')).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Check your understanding" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
  expect(errors).toEqual([]);
});

test("toc, figure, copy, and quiz are keyboard-operable", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4174" });
  await page.goto(nextUrl);
  const buildLink = page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Build It" });
  await buildLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#build-it$/);
  await expect(buildLink).toHaveAttribute("aria-current", "location");

  const learningRate = page.getByRole("figure", { name: "Interactive figure: gradient-descent" }).locator('input[type="range"]').first();
  await learningRate.focus();
  const before = await learningRate.inputValue();
  await page.keyboard.press("ArrowRight");
  expect(await learningRate.inputValue()).not.toBe(before);

  const copy = page.getByRole("button", { name: "Copy python code" }).first();
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(copy).toHaveText("Copied");

  const fieldsets = page.locator(".lesson-quiz fieldset");
  const answers = [0, 1, 3, 1, 1];
  for (const [index, answer] of answers.entries()) await fieldsets.nth(index).locator('input[type="radio"]').nth(answer).check();
  const check = page.getByRole("button", { name: "Check answers" });
  await check.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("5 of 5 correct");
});

test("legacy lesson URL redirects and unavailable lessons fail safely", async ({ page }) => {
  await page.goto(`http://127.0.0.1:4174/lesson.html?path=${lessonPath}`);
  await expect(page).toHaveURL(nextUrl);
  await page.goto("http://127.0.0.1:4174/lessons/01-math-foundations/not-migrated");
  await expect(page.getByRole("heading", { name: "This lesson is not in the local migration." })).toBeVisible();
});

test("an unavailable compatibility figure leaves an accessible fallback", async ({ page }) => {
  await page.route("**/legacy-assets/lesson-figures.js", (route) => route.abort("failed"));
  await page.goto(nextUrl);
  await expect(page.getByText("Interactive figure unavailable")).toBeVisible();
  await expect(page.getByText(/Figure source:/)).toContainText("gradient-descent");
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`reference lesson paired ${viewport.name} evidence has no Next.js overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(legacyUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
    await page.screenshot({ path: `${evidenceDirectory}/workstream-5-optimization-legacy-${viewport.name}.png` });
    await page.goto(nextUrl);
    await expect(page.locator('.lesson-quiz[data-hydrated="true"]')).toBeAttached();
    await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
    await page.screenshot({ path: `${evidenceDirectory}/workstream-5-optimization-next-${viewport.name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("captures interactive figure and completed quiz evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(nextUrl);
  const figure = page.getByRole("figure", { name: "Interactive figure: gradient-descent" });
  await figure.locator('input[type="range"]').first().fill("1.2");
  await figure.screenshot({ path: `${evidenceDirectory}/workstream-5-optimization-next-figure-desktop.png` });
  const fieldsets = page.locator(".lesson-quiz fieldset");
  for (const [index, answer] of [0, 1, 3, 1, 1].entries()) await fieldsets.nth(index).locator('input[type="radio"]').nth(answer).check();
  await page.getByRole("button", { name: "Check answers" }).click();
  await page.locator(".lesson-quiz").screenshot({ path: `${evidenceDirectory}/workstream-5-optimization-next-quiz-desktop.png` });
});
