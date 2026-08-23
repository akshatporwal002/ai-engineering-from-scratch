import { test } from "@playwright/test";
import { compareVisualPage, prepareVisualPage } from "./parity";
import { roadmapVisualOptions } from "./roadmap-visual-options";

// @visual-id visual:roadmap:selected-node-synchronized-v2
const visual = {
  id: "roadmap",
  route: "/prereqs.html",
  state: "selected-node-synchronized-v2",
  theme: "light" as const,
};

test("roadmap selected-node-synchronized-v2 matches production", async ({ page }, testInfo) => {
  await prepareVisualPage(page, visual);
  await page.locator(".roadmap-node").first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".roadmap-node").length === 20);
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; overflow-anchor: none !important; }" });
  await page.locator('.roadmap-node[data-phase="7"]').dispatchEvent("click");
  await page.locator("#roadmapInspector h2").waitFor();
  const target = await page.locator(".roadmap-workspace").evaluate(async (element) => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return Math.max(0, Math.round(element.getBoundingClientRect().top + window.scrollY) - 80);
  });
  await page.evaluate(async (top) => {
    for (let index = 0; index < 2; index += 1) {
      window.scrollTo({ top, behavior: "auto" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
  }, target);
  await page.waitForFunction((top) => Math.abs(window.scrollY - top) < 1, target, { polling: "raf" });
  await page.mouse.move(0, 0);
  await compareVisualPage(page, testInfo, visual, roadmapVisualOptions);
});
