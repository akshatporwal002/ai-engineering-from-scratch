import { expect, test } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

const completedAt = 1_787_465_600_000;
const progressState = JSON.stringify({
  lessons: {
    "certifications/claude/lessons/00-certification-strategy": { answers: {}, completedAt, completionUpdatedAt: completedAt, visitedAt: completedAt },
    "certifications/claude/lessons/01-claude-product-and-model-landscape": { answers: {}, completedAt, completionUpdatedAt: completedAt, visitedAt: completedAt },
  },
  updatedAt: completedAt,
});

const states: Array<VisualState & { progress?: boolean; ready: string }> = [
  // @visual-id visual:certification-track:default:light
  { id: "certification-track", route: "/certification.html?id=claude-ccao-f", state: "default-light", theme: "light", ready: ".cert-lesson-row" },
  // @visual-id visual:certification-track:default:dark
  { id: "certification-track", route: "/certification.html?id=claude-ccao-f", state: "default-dark", theme: "dark", ready: ".cert-lesson-row" },
  // @visual-id visual:certification-track:progress:light
  { id: "certification-track", route: "/certification.html?id=claude-ccao-f", state: "progress-light", theme: "light", ready: ".cert-lesson-row", progress: true },
];

for (const visual of states) {
  test(`${visual.id} ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual, {
      localStorage: visual.progress ? { "aifs:progress:v1": progressState } : undefined,
    });
    await expect(page.locator(visual.ready).first()).toBeVisible();
    if (visual.progress) {
      await expect(page.locator("#trackProgress")).toContainText("2 of 9 lessons complete");
      await expect(page.locator(".cert-lesson-row.is-complete")).toHaveCount(2);
    }
    await compareVisualPage(page, testInfo, visual, {
      maxViewportDiffPixels: visual.id === "certification-track" && visual.theme === "light" ? 32 : undefined,
      referenceProjectionCss: visual.id === "certification-track" && visual.theme === "light"
        ? ".cert-deep-dive-badge, .cert-deep-dive-row .cert-lesson-open { color: var(--blueprint) !important; }"
        : undefined,
    });
  });
}
