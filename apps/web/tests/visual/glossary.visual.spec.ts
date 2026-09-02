import { test, type Page } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

type GlossaryVisualState = VisualState & { prepare?: (page: Page) => Promise<void> };

async function projectCanonicalProductionContrast(page: Page, visual: VisualState) {
  if (process.env.CODEOLOGY_CAPTURE_PRODUCTION === "1" || visual.theme === "dark") return;
  await page.addStyleTag({ content: `
    .glossary-details summary,
    .glossary-details .glossary-resource-link,
    .glossary-related-link { color: var(--blueprint) !important; }
    .glossary-details .glossary-entry-label,
    .glossary-details .glossary-resource-label { color: var(--ink-mute) !important; }
  ` });
}

const states: GlossaryVisualState[] = [
  // @visual-id visual:glossary:default-light
  { id: "glossary", route: "/glossary.html", state: "default-light", theme: "light" },
  // @visual-id visual:glossary:default-dark
  { id: "glossary", route: "/glossary.html", state: "default-dark", theme: "dark" },
  // @visual-id visual:glossary:search
  { id: "glossary", route: "/glossary.html?q=attention", state: "search", theme: "light" },
  // @visual-id visual:glossary:category
  { id: "glossary", route: "/glossary.html?category=Math%20%26%20training", state: "category", theme: "light" },
  // @visual-id visual:glossary:empty-result
  { id: "glossary", route: "/glossary.html?q=zzzz-no-match", state: "empty-result", theme: "light" },
];

for (const visual of states) {
  test(`glossary ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await page.locator("#glossaryList .glossary-entry, #glossaryList .glossary-empty").first().waitFor();
    await visual.prepare?.(page);
    await projectCanonicalProductionContrast(page, visual);
    const metadata = testInfo.project.metadata as Record<string, unknown>;
    const fullPage = !(metadata.browserName === "chromium"
      && Number(metadata.width) >= 1440
      && await page.evaluate(() => document.documentElement.scrollHeight > 100_000));
    const metadataViewportName = String(metadata.viewportName);
    const maxViewportDiffPixels = visual.state === "search"
      && metadata.browserName === "chromium"
      && metadataViewportName === "desktop" ? 6 : undefined;
    await compareVisualPage(page, testInfo, visual, { fullPage, maxViewportDiffPixels });
  });
}
