import { test } from "@playwright/test";
import { compareVisualPage, prepareVisualPage } from "./parity";
import { roadmapVisualOptions } from "./roadmap-visual-options";

// @visual-id visual:roadmap:mobile-warmed
const visual = {
  id: "roadmap",
  route: "/prereqs.html",
  state: "mobile-warmed",
  theme: "light" as const,
};

test("roadmap mobile-warmed matches production", async ({ page }, testInfo) => {
  await prepareVisualPage(page, visual);
  await page.locator(".roadmap-node").first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".roadmap-node").length === 20);
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; overflow-anchor: none !important; }" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const target = await page.locator(".roadmap-workspace").evaluate((element) => {
    let top = 0;
    let current: HTMLElement | null = element as HTMLElement;
    while (current) {
      top += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }
    return Math.max(0, Math.round(top) - 80);
  });
  await page.evaluate((top) => window.scrollTo({ top, behavior: "auto" }), target);
  await page.waitForFunction((top) => Math.abs(window.scrollY - top) < 1, target, { polling: "raf" });
  await page.mouse.move(0, 0);
  await page.screenshot({ animations: "disabled", caret: "hide" });
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  // Chromium varies 1-2 grayscale channel values on 17 rounded-edge samples;
  // Pixelmatch classifies at most six. Geometry and full-page output stay exact.
  await compareVisualPage(page, testInfo, visual, { ...roadmapVisualOptions, maxViewportDiffPixels: 6 });
});
