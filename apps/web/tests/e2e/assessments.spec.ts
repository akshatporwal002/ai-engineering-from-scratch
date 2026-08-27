import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route = "/assessments/claude-ccao-f-diagnostic";

test("assessment supports direct loading, keyboard answers, scoring, and refresh", async ({ page }) => {
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1, name: "Associate Foundations Diagnostic" })).toBeVisible();
  const form = page.getByRole("form", { name: "Assessment questions" });
  await expect(form).toBeVisible();
  const choices = form.getByRole("radio");
  await choices.first().focus();
  await page.keyboard.press("Space");
  await expect(choices.first()).toBeChecked();
  await form.getByRole("button", { name: "Submit practice" }).click();
  await expect(page.getByRole("region", { name: "Assessment result" })).toBeVisible();
  await expect(page).toHaveURL(/\?id=claude-ccao-f-diagnostic&result=latest$/);
  await page.reload();
  await expect(page.getByRole("region", { name: "Assessment result" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
