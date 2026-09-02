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
    else if (url.hostname === "fonts.googleapis.com") await route.fulfill({ status: 200, contentType: "text/css", body: "" });
    else await route.fulfill({ status: 204, body: "" });
  });
}

async function expectNoBlockingAxeFindings(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
}

function isHarnessOnlyConsoleError(message: string) {
  return message.includes("ERR_BLOCKED_BY_CLIENT.Inspector")
    || (message.includes("/127.0.0.1:4174/") && message.includes("due to access control checks."));
}

test.beforeEach(async ({ page }) => keepNavigationLocal(page));

for (const route of routes) {
  test(`${route.name} renders with valid landmarks and accessibility`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !isHarnessOnlyConsoleError(message.text())) errors.push(message.text());
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
      if (message.type() === "error" && !isHarnessOnlyConsoleError(message.text())) errors.push(message.text());
    });
    page.on("pageerror", (error) => { if (!isHarnessOnlyConsoleError(error.message)) errors.push(error.message); });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText;
      if ((url.hostname === "127.0.0.1" || url.hostname === "localhost")
        && failure !== "net::ERR_ABORTED"
        && failure !== "cancelled") {
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

test("catalog search is keyboard-operable", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator('.public-explorer[data-hydrated="true"]')).toBeVisible();
  const catalogSearch = page.getByRole("searchbox", { name: "Search lessons" });
  await catalogSearch.fill("Dev Environment");
  await expect(page.getByRole("status")).toContainText("1 of 503 lessons");
  await expect(page.getByRole("heading", { name: "Dev Environment" })).toBeVisible();
  const lesson = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Dev Environment" }) });
  await expect(lesson.getByRole("link", { name: /Open lesson/ })).toHaveAttribute("href", "/lessons/00-setup-and-tooling/01-dev-environment");
});

test("public-routes:glossary preserves interactions and accessibility across motion preferences", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isHarnessOnlyConsoleError(message.text())) errors.push(message.text());
  });
  page.on("pageerror", (error) => { if (!isHarnessOnlyConsoleError(error.message)) errors.push(error.message); });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure()?.errorText;
    if ((url.hostname === "127.0.0.1" || url.hostname === "localhost")
      && failure !== "net::ERR_ABORTED"
      && failure !== "cancelled") {
      errors.push(`${request.method()} ${url.pathname}: ${failure}`);
    }
  });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    for (const url of ["http://127.0.0.1:4173/glossary.html", "http://127.0.0.1:4174/glossary"]) {
      const mainId = url.includes(":4173/") ? "main" : "main-content";
      await page.goto(url);
      await expect(page.locator(".glossary-explorer")).toBeVisible();
      await expect(page.locator("#glossaryList .glossary-entry").first()).toBeVisible();
      await settleFiniteMotion(page);

      await expect(page.locator(`main#${mainId}`)).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: "Glossary" })).toHaveCount(1);
      const skip = page.getByRole("link", { name: "Skip to content" });
      await skip.focus();
      await expect(skip).toBeFocused();
      await expect(skip).not.toHaveCSS("outline-style", "none");

      const search = page.getByRole("searchbox", { name: "Search the ledger" });
      await page.keyboard.press("/");
      await expect(search).toBeFocused();
      await search.fill("training-memory technique");
      await expect(page.locator("#glossaryCount")).toContainText("1 of 243 terms");
      await expect(page.getByRole("heading", { name: "Activation Checkpointing", exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\?q=training-memory\+technique$/);
      await page.keyboard.press("Escape");
      await expect(search).toHaveValue("");
      await expect(search).toBeFocused();

      const allTerms = page.locator('[data-category="all"]');
      await allTerms.focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.locator('[data-category="Math & training"]')).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator('[data-category="Math & training"]')).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/category=Math(?:\+|%20)%26(?:\+|%20)training$/);

      await search.fill("definitely-no-glossary-match");
      await expect(page.getByRole("heading", { name: "No matching reference" })).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();

      const letterB = page.getByRole("button", { name: "Jump to letter B" });
      await letterB.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#letter-B")).toBeFocused();
      await expect(page.locator("#letter-B")).not.toHaveCSS("outline-style", "none");

      await page.goto(`${url}#backpropagation`);
      const backpropagation = page.locator("#backpropagation");
      await expect(backpropagation).toHaveClass(/is-focused/);
      await expect(backpropagation).toBeFocused();
      await expect(backpropagation).not.toHaveCSS("outline-style", "none");
      await backpropagation.locator("summary").click();
      await expect(backpropagation.getByRole("link", { name: "Backpropagation from Scratch" })).toHaveAttribute("href", /(?:\/lessons\/03-deep-learning-core\/03-backpropagation|lesson\.html\?path=phases%2F03-deep-learning-core%2F03-backpropagation)/);
      await backpropagation.getByRole("link", { name: "Gradient" }).click();
      await expect(page).toHaveURL(/#gradient$/);
      await expect(page.locator("#gradient")).toBeFocused();

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectNoBlockingAxeFindings(page);
      expect(errors).toEqual([]);
    }
  }
});

test("public-routes:roadmap preserves graph interactions and accessibility across motion preferences", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isHarnessOnlyConsoleError(message.text())) errors.push(message.text());
  });
  page.on("pageerror", (error) => { if (!isHarnessOnlyConsoleError(error.message)) errors.push(error.message); });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure()?.errorText;
    if ((url.hostname === "127.0.0.1" || url.hostname === "localhost")
      && failure !== "net::ERR_ABORTED"
      && failure !== "cancelled") {
      errors.push(`${request.method()} ${url.pathname}: ${failure}`);
    }
  });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    for (const surface of [
      { url: "http://127.0.0.1:4173/prereqs.html", mainId: "main" },
      { url: "http://127.0.0.1:4174/roadmap", mainId: "main-content" },
    ]) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(surface.url);
      await expect(page.locator(".roadmap-node")).toHaveCount(20);
      await expect(page.locator(`main#${surface.mainId}`)).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: "Map your route through AI engineering." })).toHaveCount(1);

      const skip = page.getByRole("link", { name: "Skip to content" });
      await skip.focus();
      await expect(skip).toBeFocused();
      await expect(skip).not.toHaveCSS("outline-style", "none");

      const firstNode = page.locator('.roadmap-node[data-phase="0"]');
      await firstNode.focus();
      await expect(firstNode).toBeFocused();
      await page.keyboard.press("ArrowDown");
      const focusedNode = page.locator(".roadmap-node:focus");
      await expect(focusedNode).toHaveCount(1);
      await page.keyboard.press("Enter");
      await expect(focusedNode).toHaveAttribute("aria-pressed", "true");
      const selectedPhase = await focusedNode.getAttribute("data-phase");
      await expect(page).toHaveURL(new RegExp(`#phase-${String(selectedPhase).padStart(2, "0")}$`));
      await expect(page.locator("#roadmapInspector h2")).toBeVisible();

      await page.locator('.roadmap-node[data-phase="7"]').click();
      await expect(page).toHaveURL(/#phase-07$/);
      await page.locator('.roadmap-node[data-phase="14"]').click();
      await expect(page).toHaveURL(/#phase-14$/);
      await page.goBack();
      await expect(page.locator('.roadmap-node[data-phase="7"]')).toHaveAttribute("aria-pressed", "true");

      const initialZoom = await page.locator("#roadmapZoomValue").textContent();
      await page.getByRole("button", { name: "Zoom in" }).click();
      await expect(page.locator("#roadmapZoomValue")).not.toHaveText(initialZoom ?? "100%");
      await page.getByRole("button", { name: "Zoom out" }).click();

      const phaseSelect = page.getByRole("combobox", { name: "Find a phase" });
      await phaseSelect.focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("listbox")).toBeVisible();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#phase-19$/);

      const graphWrap = page.locator("#roadmapGraphWrap");
      await graphWrap.scrollIntoViewIfNeeded();
      await graphWrap.evaluate((element) => { element.scrollLeft = 180; element.scrollTop = 180; });
      const beforePan = await graphWrap.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
      const box = await graphWrap.boundingBox();
      expect(box).not.toBeNull();
      const dragStart = await graphWrap.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const left = Math.max(rect.left + 8, 8);
        const right = Math.min(rect.right - 8, window.innerWidth - 8);
        const top = Math.max(rect.top + 8, 8);
        const bottom = Math.min(rect.bottom - 8, window.innerHeight - 8);
        for (let y = top; y <= bottom; y += 12) {
          for (let x = left; x <= right; x += 12) {
            const target = document.elementFromPoint(x, y);
            if (target && element.contains(target) && !target.closest(".roadmap-node")) return { x, y };
          }
        }
        throw new Error("No blank graph point available for the pan smoke path");
      });
      await page.mouse.move(dragStart.x, dragStart.y);
      await page.mouse.down();
      await page.mouse.move(dragStart.x - 60, dragStart.y - 60, { steps: 4 });
      await page.mouse.up();
      const afterPan = await graphWrap.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
      expect(afterPan).not.toEqual(beforePan);

      await page.goto(`${surface.url}#phase-14`);
      await expect(page.locator('.roadmap-node[data-phase="14"]')).toHaveAttribute("aria-pressed", "true");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectNoBlockingAxeFindings(page);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(surface.url);
      await expect(page.locator(".roadmap-node")).toHaveCount(20);
      await page.locator('.roadmap-node[data-phase="7"]').click();
      await expect(page.locator("#roadmapInspector h2")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectNoBlockingAxeFindings(page);
      expect(errors).toEqual([]);
    }
  }
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

test("academy lesson links use canonical routes and legacy malformed links recover", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Open Phase 00:/ }).click();

  const lessonLink = page.getByRole("link", { name: "Open lesson: Dev Environment" });
  await expect(lessonLink).toHaveAttribute("href", "/lessons/00-setup-and-tooling/01-dev-environment");
  await lessonLink.click();
  await expect(page).toHaveURL(/\/lessons\/00-setup-and-tooling\/01-dev-environment$/);

  await page.goto("/lessons/phases/11-llm-engineering/04-embeddings");
  await expect(page).toHaveURL(/\/lessons\/11-llm-engineering\/04-embeddings$/);
  await expect(page.getByRole("heading", { name: "Embeddings & Vector Representations", level: 1 })).toBeVisible();
});

test("academy local progress updates without creating external state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Open Phase 00:/ }).click();
  const markDone = page.getByRole("button", { name: "Mark complete" }).first();
  await markDone.click();
  await expect(page.getByRole("button", { name: "Mark as not done" }).first()).toBeVisible();
  expect(await page.evaluate(() => Boolean(localStorage.getItem("aifs:progress:v1")))).toBe(true);
});

const certificationSurfaces = [
  { id: "legacy", origin: "http://127.0.0.1:4173", main: "main", catalog: "/certifications.html", track: "/certification.html?id=claude-ccao-f", next: false },
  { id: "next", origin: "http://127.0.0.1:4174", main: "main-content", catalog: "/certifications", track: "/certifications/ccao-f", next: true },
] as const;

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  for (const surface of certificationSurfaces) {
    test(`certification ${surface.id} preserves interactions with ${reducedMotion} motion`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !isHarnessOnlyConsoleError(message.text())) errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) => {
        const url = new URL(request.url());
        const failure = request.failure()?.errorText;
        if ((url.hostname === "127.0.0.1" || url.hostname === "localhost")
          && failure !== "net::ERR_ABORTED"
          && failure !== "cancelled") errors.push(`${request.method()} ${url.pathname}: ${failure}`);
      });

      await page.emulateMedia({ reducedMotion });
      // The legacy page has a remote decorative badge that this suite blocks;
      // its document and all asserted certification controls are ready at DOM
      // content load, before that intentionally aborted asset can hold `load`.
      await page.goto(surface.origin + surface.catalog, { waitUntil: surface.next ? "load" : "domcontentloaded" });
      await expect(page.locator(".cert-track-card")).toHaveCount(4);
      await settleFiniteMotion(page);
      const firstCard = page.locator(".cert-track-card").first();
      await firstCard.focus();
      await expect(firstCard).toBeFocused();
      await expect(firstCard).not.toHaveCSS("outline-style", "none");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectNoBlockingAxeFindings(page);

      await page.goto(surface.origin + surface.track, { waitUntil: surface.next ? "load" : "domcontentloaded" });
      await expect(page.locator(".cert-lesson-row")).toHaveCount(9);
      await expect(page.locator(".cert-assessment-card")).toHaveCount(2);
      await settleFiniteMotion(page);
      const skip = page.getByRole("link", { name: "Skip to content" });
      await skip.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(`main#${surface.main}`)).toBeFocused();
      await expect(page.locator("#trackProgress [role=progressbar]")).toHaveAttribute("aria-valuenow", "0");
      if (surface.next) {
        await expect(page.locator(".cert-lesson-open").first()).toHaveAttribute("href", /^\/lessons\//);
        await expect(page.locator(".cert-assessment-card .cert-action").first()).toHaveAttribute("href", /^\/assessments\//);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectNoBlockingAxeFindings(page);
      expect(errors).toEqual([]);
    });
  }
}

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
