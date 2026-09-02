import { test, type Page } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";
import { roadmapVisualOptions } from "./roadmap-visual-options";

type FlowVisualState = VisualState & {
  anchor: string;
  prepare: (page: Page) => Promise<void>;
};

async function flowTop(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    let top = 0;
    let current: HTMLElement | null = element as HTMLElement;
    while (current) {
      top += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }
    return Math.max(0, Math.round(top) - 80);
  });
}

async function synchronizeAtFlowAnchor(page: Page, selector: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const target = await flowTop(page, selector);
  await page.evaluate(async (top) => {
    for (let index = 0; index < 2; index += 1) {
      window.scrollTo({ top, behavior: "auto" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
  }, target);
  await page.waitForFunction((top) => Math.abs(window.scrollY - top) < 1, target, { polling: "raf" });
  await page.mouse.move(0, 0);
}

const states: FlowVisualState[] = [
  // @visual-id visual:roadmap:inspector-flow-synchronized
  {
    id: "roadmap", route: "/prereqs.html", state: "inspector-flow-synchronized", theme: "light", anchor: "#roadmapInspector",
    prepare: async (page) => {
      await page.locator('.roadmap-node[data-phase="14"]').dispatchEvent("click");
      await page.locator("#roadmapInspector h2").waitFor();
    },
  },
  // @visual-id visual:roadmap:url-hash-flow-synchronized
  {
    id: "roadmap", route: "/prereqs.html#phase-14", state: "url-hash-flow-synchronized", theme: "light", anchor: ".roadmap-workspace",
    prepare: async (page) => { await page.locator('.roadmap-node[data-phase="14"][aria-pressed="true"]').waitFor(); },
  },
];

for (const visual of states) {
  test(`roadmap ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await page.locator(".roadmap-node").first().waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".roadmap-node").length === 20);
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; overflow-anchor: none !important; }" });
    await visual.prepare(page);
    await synchronizeAtFlowAnchor(page, visual.anchor);
    await compareVisualPage(page, testInfo, visual, roadmapVisualOptions);
  });
}
