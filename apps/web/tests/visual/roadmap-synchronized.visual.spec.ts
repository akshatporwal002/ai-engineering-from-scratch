import { test, type Page } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";
import { roadmapVisualOptions } from "./roadmap-visual-options";

type RoadmapVisualState = VisualState & {
  anchor: string;
  prepare: (page: Page) => Promise<void>;
};

async function waitForRoadmap(page: Page) {
  await page.locator(".roadmap-node").first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".roadmap-node").length === 20);
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; overflow-anchor: none !important; }" });
}

async function waitForDynamicLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForFunction(() => {
    const graph = document.querySelector<HTMLElement>(".roadmap-graph-wrap");
    const inspector = document.querySelector<HTMLElement>("#roadmapInspector");
    const panelRect = inspector?.getBoundingClientRect();
    const key = JSON.stringify({
      graphLeft: graph?.scrollLeft ?? 0,
      graphTop: graph?.scrollTop ?? 0,
      graphWidth: graph?.scrollWidth ?? 0,
      graphHeight: graph?.scrollHeight ?? 0,
      panelHeight: panelRect?.height ?? 0,
      panelContentHeight: inspector?.scrollHeight ?? 0,
      hash: window.location.hash,
    });
    const state = window as typeof window & { __roadmapLayoutKey?: string; __roadmapLayoutFrames?: number };
    state.__roadmapLayoutFrames = state.__roadmapLayoutKey === key ? (state.__roadmapLayoutFrames ?? 0) + 1 : 0;
    state.__roadmapLayoutKey = key;
    return document.fonts.status === "loaded" && state.__roadmapLayoutFrames >= 3;
  }, undefined, { polling: "raf" });
}

async function anchorAfterLayout(page: Page, selector: string) {
  await waitForDynamicLayout(page);
  const target = await page.locator(selector).evaluate((element) => {
    const documentTop = element.getBoundingClientRect().top + window.scrollY;
    return Math.max(0, Math.round(documentTop) - 80);
  });
  await page.evaluate(async (top) => {
    for (let index = 0; index < 2; index += 1) {
      window.scrollTo({ top, behavior: "auto" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
  }, target);
  await page.waitForFunction((top) => Math.abs(window.scrollY - top) < 1, target, { polling: "raf" });
  await page.mouse.move(0, 0);
}

const states: RoadmapVisualState[] = [
  // @visual-id visual:roadmap:zoomed-synchronized
  {
    id: "roadmap", route: "/prereqs.html", state: "zoomed-synchronized", theme: "light", anchor: ".roadmap-workspace",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Zoom in" }).dispatchEvent("click");
      await page.getByRole("button", { name: "Zoom in" }).dispatchEvent("click");
    },
  },
];

for (const visual of states) {
  test(`roadmap ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await waitForRoadmap(page);
    await visual.prepare(page);
    await anchorAfterLayout(page, visual.anchor);
    await compareVisualPage(page, testInfo, visual, roadmapVisualOptions);
  });
}
