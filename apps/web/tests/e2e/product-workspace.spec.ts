import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const fixtureText = "Synthetic candidate profile for local browser testing only. Built deterministic evaluation services, measured reliability, documented decisions, and improved system observability without using any real person's information.";

async function localOnly(page: Page) {
  await page.route("**/*", async (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === "127.0.0.1" || host === "localhost") await route.continue(); else await route.abort("blockedbyclient");
  });
}

async function connect(page: Page, outcome: string) {
  await page.getByLabel("Fixture outcome").selectOption(outcome);
  const button = page.getByRole("button", { name: "Connect opaque fixture" });
  await button.scrollIntoViewIfNeeded();
  const [response] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/providers" && response.request().method() === "POST"),
    button.click(),
  ]);
  expect(response.request().postDataJSON().credential).toBe(`fake-${outcome}`);
  expect(response.status()).toBe(outcome === "invalid" ? 400 : 201);
  await expect(page.getByRole("status")).toContainText(outcome === "invalid" ? "provider_request_invalid" : "Fixture provider connected");
  await expect(button).toBeEnabled();
}

async function analyze(page: Page) {
  await page.getByLabel("Or paste synthetic CV text").fill(fixtureText);
  const button = page.getByRole("button", { name: "Run mock analysis" });
  await button.scrollIntoViewIfNeeded();
  const [response] = await Promise.all([
    page.waitForResponse((response) => /\/api\/v1\/cv\/documents\/[^/]+\/analyses$/.test(new URL(response.url()).pathname) && response.request().method() === "POST"),
    button.click(),
  ]);
  expect(response.status()).toBe(201);
  await expect(button).toBeEnabled();
}

test.beforeEach(async ({ page }) => { await localOnly(page); await page.goto("/cv-analysis"); });

test("success journey, progress, history, and signed-out states are accessible", async ({ page }) => {
  await page.getByRole("button", { name: "View signed-out state" }).click();
  await expect(page.getByText("No account is created.")).toBeVisible();
  await page.getByRole("button", { name: "Enter fixture account" }).click();
  await connect(page, "success");
  await expect(page.getByRole("status")).toContainText("Fixture provider connected");
  await analyze(page);
  await expect(page.getByRole("status")).toContainText("Mock analysis complete");
  await expect(page.getByRole("heading", { name: /Readiness communication score: 72/ })).toBeVisible();
  await expect(page.locator(".product-metrics article")).toHaveCount(5);
  await expect(page.locator(".product-signals span")).toHaveCount(9);
  await expect(page.getByRole("heading", { name: "Suggested rewrites" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lesson suggestions" })).toBeVisible();
  await expect(page.getByLabel("Or paste synthetic CV text")).toHaveValue("");
  await page.getByRole("button", { name: "Reconcile fixture progress" }).click();
  await expect(page.getByRole("status")).toContainText("without creating evidence");
  await page.getByRole("button", { name: "Update model" }).last().click();
  await expect(page.getByRole("status")).toContainText("re-verified");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("every fake-provider failure is actionable and contains no fixture input", async ({ page }) => {
  await connect(page, "invalid");
  await expect(page.getByRole("status")).toContainText("provider_request_invalid");
  for (const [outcome, code] of Object.entries({ quota: "provider_service_error", rate_limit: "analysis_rate_limited", unavailable: "provider_unavailable", timeout: "provider_timeout", malformed: "provider_schema_invalid", safety: "provider_rejected" })) {
    await connect(page, outcome);
    await analyze(page);
    await expect(page.getByRole("status")).toContainText(code);
    await expect(page.getByLabel("Or paste synthetic CV text")).toHaveValue("");
  }
});

test("upload, reopen, delete cancellation, and confirmed deletion work", async ({ page }) => {
  await connect(page, "success");
  await page.getByLabel("Upload synthetic PDF, DOCX, TXT, or Markdown").setInputFiles({ name: "synthetic.txt", mimeType: "text/plain", buffer: Buffer.from(fixtureText) });
  await page.getByRole("button", { name: "Run mock analysis" }).click();
  await expect(page.getByRole("status")).toContainText("Mock analysis complete");
  for (let index = 0; index < 3; index += 1) {
    await analyze(page);
    await expect(page.getByRole("status")).toContainText("Mock analysis complete");
  }
  await expect(page.getByRole("button", { name: "Next history page" })).toBeEnabled();
  await page.getByRole("button", { name: "Next history page" }).click();
  await expect(page.getByRole("button", { name: "Previous history page" })).toBeEnabled();
  await page.getByRole("button", { name: "Previous history page" }).click();
  await page.locator(".product-history li button").first().click();
  await expect(page.getByRole("status")).toContainText("Opened");
  await page.locator(".product-history").getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Delete fixture document?" })).toHaveCount(0);
  await page.locator(".product-history").getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("status")).toContainText("permanently removed");
});

for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 1000 }]) {
  test(`${viewport.name} product layout has no secret, CV text, or overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("http://127.0.0.1:4173/cv-analysis.html");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto("http://127.0.0.1:4174/cv-analysis");
    if (viewport.name === "desktop") {
      await connect(page, "success");
      await expect(page.getByRole("status")).toContainText("Fixture provider connected");
      await analyze(page);
      await expect(page.getByRole("status")).toContainText("Mock analysis complete");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator("body").innerText()).not.toContain(fixtureText);
    const bodyText = await page.locator("body").innerText();
    for (const secret of [
      "fake-success",
      "fake-invalid",
      "fake-quota",
      "fake-rate_limit",
      "fake-unavailable",
      "fake-timeout",
      "fake-malformed",
      "fake-safety",
    ]) {
      expect(bodyText).not.toContain(secret);
    }
  });
}
