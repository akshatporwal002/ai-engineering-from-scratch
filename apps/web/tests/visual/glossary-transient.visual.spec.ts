import { test, type Page } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

type GlossaryTransientState = VisualState & { prepare: (page: Page) => Promise<void>; fullPage?: boolean };

async function projectCanonicalProductionContrast(page: Page) {
  if (process.env.CODEOLOGY_CAPTURE_PRODUCTION === "1") return;
  await page.addStyleTag({ content: `
    .glossary-details summary,
    .glossary-details .glossary-resource-link,
    .glossary-related-link { color: var(--blueprint) !important; }
    .glossary-details .glossary-entry-label,
    .glossary-details .glossary-resource-label { color: var(--ink-mute) !important; }
  ` });
}

const states: GlossaryTransientState[] = [
  // @visual-id visual:glossary:letter-navigation
  {
    id: "glossary",
    route: "/glossary.html",
    state: "letter-navigation",
    theme: "light",
    prepare: async (page) => {
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
      await page.locator('[data-letter="B"]').click();
      await page.locator("#letter-B").evaluate((section) => {
        (section as HTMLElement).focus({ preventScroll: true });
        section.scrollIntoView({ block: "start", behavior: "auto" });
      });
    },
  },
  // @visual-id visual:glossary:deep-anchor-synchronized
  {
    id: "glossary",
    route: process.env.CODEOLOGY_CAPTURE_PRODUCTION === "1" ? "/glossary.html" : "/glossary",
    state: "deep-anchor-synchronized",
    theme: "light",
    // Chromium's 129k-pixel full-page tiling is nondeterministic after scrolling;
    // the paired viewport is exact and the stable-state suite covers the full page.
    fullPage: false,
    prepare: async (page) => {
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
      await page.locator("#backpropagation").evaluate((entry) => {
        history.replaceState(history.state, "", `${location.pathname}${location.search}#backpropagation`);
        document.querySelectorAll(".glossary-entry.is-focused").forEach((node) => node.classList.remove("is-focused"));
        entry.classList.add("is-focused");
        (entry as HTMLElement).focus({ preventScroll: true });
        const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
        window.scrollTo({ top: window.scrollY + entry.getBoundingClientRect().top - headerBottom, behavior: "auto" });
      });
    },
  },
];

for (const visual of states) {
  test(`glossary ${visual.state} matches production after state synchronization`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await page.locator("#glossaryList .glossary-entry").first().waitFor();
    await visual.prepare(page);
    await projectCanonicalProductionContrast(page);
    const metadata = testInfo.project.metadata as Record<string, unknown>;
    const chromiumCanvasLimit = metadata.browserName === "chromium"
      && Number(metadata.width) >= 1440
      && await page.evaluate(() => document.documentElement.scrollHeight > 100_000);
    await compareVisualPage(page, testInfo, visual, { fullPage: visual.fullPage !== false && !chromiumCanvasLimit });
  });
}
