import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

type BrowserName = "chromium" | "firefox" | "webkit";

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
  await page.route("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs", (route) => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    body: `export default { initialize() {}, render(id, source) { const label = source.split("\\n").find((line) => line.includes("[")) || "Mermaid diagram"; return Promise.resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram flow" viewBox="0 0 640 80"><rect width="640" height="80" fill="transparent"/><text x="16" y="44" fill="currentColor">' + label.replace(/[<>&]/g, "") + '</text></svg>' }); } };`,
  }));
}

test.beforeEach(async ({ page }) => isolateLesson(page));

test("reference lesson is accessible and exposes every reader mechanism", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(nextUrl);
  await expect(page.locator(".quiz-section").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
  await expect(page.locator(".code-copy")).toHaveCount(11);
  await expect(page.locator(".mermaid-render svg")).toHaveCount(5);
  await expect(page.getByRole("figure", { name: "Interactive figure: gradient-descent" }).locator('input[type="range"]')).toHaveCount(3);
  await expect(page.locator(".quiz-title").first()).toContainText("Pre-Lesson Check");
  await expect(page.locator(".quiz-title").nth(1)).toContainText("Post-Lesson Quiz");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
  expect(errors).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  for (const surface of [
    { name: "maintained legacy", url: legacyUrl },
    { name: "Next.js", url: nextUrl },
  ]) {
    test(`${surface.name} lesson has no blocking Axe findings with ${reducedMotion} motion`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto(surface.url);
      await expect(page.locator(".quiz-section").first()).toBeVisible();
      await expect(page.locator(".mermaid-render svg")).toHaveCount(5);
      await expect(page.locator('.lesson-figure[data-figure="gradient-descent"] input[type="range"]')).toHaveCount(3);
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
      expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
    });
  }
}

async function allowClipboard(page: Page, browserName: BrowserName) {
  if (browserName === "chromium") {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4174" });
    return;
  }
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
}

test("toc, figure, copy, and quiz are keyboard-operable", async ({ page, browserName }) => {
  await allowClipboard(page, browserName);
  await page.goto(nextUrl);
  const buildLink = page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Build It" });
  await buildLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#build-it$/);
  await expect(buildLink).toHaveClass(/active/);

  const learningRate = page.getByRole("figure", { name: "Interactive figure: gradient-descent" }).locator('input[type="range"]').first();
  await learningRate.focus();
  const before = await learningRate.inputValue();
  await page.keyboard.press("ArrowRight");
  expect(await learningRate.inputValue()).not.toBe(before);

  const copy = page.locator(".code-copy").first();
  await expect(copy).toHaveAccessibleName("Copy");
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(copy).toHaveText("Copied!");

  const questions = page.locator(".quiz-section .quiz-question");
  const answers = [0, 1, 3, 1, 1];
  for (const [index, answer] of answers.entries()) {
    const option = questions.nth(index).locator(".quiz-option").nth(answer);
    await option.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".quiz-score-result").first()).toContainText("2/2 correct");
  await expect(page.locator(".quiz-score-result").nth(1)).toContainText("3/3 correct");
});

test("legacy lesson URL redirects and unavailable lessons fail safely", async ({ page }) => {
  await page.goto(`http://127.0.0.1:4174/lesson.html?path=${lessonPath}`);
  await expect(page).toHaveURL(nextUrl);
  await page.goto("http://127.0.0.1:4174/lessons/01-math-foundations/not-migrated");
  await expect(page.getByRole("heading", { name: "We could not find that lesson." })).toBeVisible();
});

test("published non-reference lessons load internally and legacy URLs redirect", async ({ page }) => {
  const route = "/lessons/02-ml-fundamentals/01-what-is-machine-learning";
  await page.goto(`http://127.0.0.1:4174${route}`);
  await expect(page.getByRole("heading", { level: 1, name: "What Is Machine Learning" })).toBeVisible();
  await expect(page.locator(".lesson-article")).toBeVisible();
  await page.goto("http://127.0.0.1:4174/lesson.html?path=phases/02-ml-fundamentals/01-what-is-machine-learning");
  await expect(page).toHaveURL(new RegExp(`${route}$`));
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
  test(`reference lesson ${viewport.name} layout has no overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("theme", "light");
      document.documentElement.dataset.theme = "light";
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(legacyUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto(`http://127.0.0.1:4174/lesson.html?path=${lessonPath}`);
    await expect(page.locator(".quiz-section").first()).toBeAttached();
    await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
    await expect(page.locator(".code-card")).toHaveCount(2);
    await page.addStyleTag({ content: "*, *::before, *::after { caret-color: transparent !important; animation-play-state: paused !important; transition-duration: 0s !important; transition-delay: 0s !important; }" });
    const overflow = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 8)
        .map((element) => ({ selector: `${element.tagName}.${element.className}`, right: Math.round(element.getBoundingClientRect().right) })),
    }));
    expect(overflow, JSON.stringify(overflow)).toMatchObject({ scrollWidth: overflow.width });
  });
}

test("interactive figure and completed quiz states remain functional", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(nextUrl);
  const figure = page.getByRole("figure", { name: "Interactive figure: gradient-descent" });
  await figure.locator('input[type="range"]').first().fill("1.2");
  await expect(figure).toBeVisible();
  const questions = page.locator(".quiz-section .quiz-question");
  for (const [index, answer] of [0, 1, 3, 1, 1].entries()) await questions.nth(index).locator(".quiz-option").nth(answer).click();
  await expect(page.locator(".quiz-score-result").first()).toContainText("2/2 correct");
  await expect(page.locator(".quiz-score-result").nth(1)).toContainText("3/3 correct");
});
