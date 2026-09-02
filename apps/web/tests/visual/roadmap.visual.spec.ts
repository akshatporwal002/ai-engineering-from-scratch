import { test, type Page } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";
import { roadmapVisualOptions } from "./roadmap-visual-options";

async function waitForRoadmap(page: Page) {
  await page.locator(".roadmap-node").first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".roadmap-node").length === 20);
}

const states: VisualState[] = [
  // @visual-id visual:roadmap:default-graph-light
  { id: "roadmap", route: "/prereqs.html", state: "default-graph-light", theme: "light" },
  // @visual-id visual:roadmap:default-graph-dark
  { id: "roadmap", route: "/prereqs.html", state: "default-graph-dark", theme: "dark" },
];

for (const visual of states) {
  test(`roadmap ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await waitForRoadmap(page);
    await compareVisualPage(page, testInfo, visual, roadmapVisualOptions);
  });
}
