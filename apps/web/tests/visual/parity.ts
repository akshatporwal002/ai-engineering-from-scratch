import { expect, type Page, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(__dirname, "../../../..");
const evidenceRoot = path.join(repositoryRoot, "docs/migration-evidence/visual-parity");
const captureProduction = process.env.CODEOLOGY_CAPTURE_PRODUCTION === "1";

export type VisualState = {
  id: string;
  route: string;
  state: string;
  theme: "light" | "dark";
};

function projectMetadata(testInfo: TestInfo) {
  const metadata = testInfo.project.metadata as Record<string, unknown>;
  const browserName = String(metadata.browserName);
  const viewportName = String(metadata.viewportName);
  if (!browserName || !viewportName) throw new Error(`Missing visual project metadata for ${testInfo.project.name}`);
  return { browserName, viewportName };
}

function artifactParts(testInfo: TestInfo, visual: VisualState, suffix: "viewport" | "full-page") {
  const { browserName, viewportName } = projectMetadata(testInfo);
  return [browserName, viewportName, visual.id, `${visual.state}-${suffix}.png`];
}

function artifactPath(kind: "reference-production" | "candidate-next" | "diffs" | "accessibility-pre-correction-projection", parts: string[]) {
  return path.join(evidenceRoot, kind, ...parts);
}

export async function prepareVisualPage(page: Page, visual: VisualState) {
  await page.addInitScript((theme) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, visual.theme);
  await page.goto(visual.route, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const wordmark = document.querySelector<HTMLElement>(".site-header .logo .codeology-wordmark");
    return document.documentElement.dataset.product === "codeology" && wordmark?.textContent?.trim() === "CODEOLOGY";
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      caret-color: transparent !important;
      animation-play-state: paused !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  ` });
  await page.waitForTimeout(100);
}

function migrationCommit() {
  const commit = process.env.CODEOLOGY_MIGRATION_COMMIT;
  if (!commit) throw new Error("Explicit capture runner did not provide CODEOLOGY_MIGRATION_COMMIT");
  return commit;
}

function migrationTree() {
  const tree = process.env.CODEOLOGY_MIGRATION_TREE;
  if (!tree) throw new Error("Explicit capture runner did not provide CODEOLOGY_MIGRATION_TREE");
  return tree;
}

function writeReference(buffer: Buffer, target: string, page: Page, testInfo: TestInfo, visual: VisualState) {
  if (existsSync(target)) {
    throw new Error(`Immutable production reference already exists: ${path.relative(repositoryRoot, target)}`);
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, buffer, { flag: "wx" });
  const { browserName, viewportName } = projectMetadata(testInfo);
  const metadata = {
    productionUrl: page.url(),
    capturedAt: new Date().toISOString(),
    browserProject: browserName,
    viewport: { name: viewportName, ...testInfo.project.use.viewport },
    theme: visual.theme,
    routeState: visual.state,
    visualTestId: visual.id,
    migrationCommit: migrationCommit(),
    migrationTree: migrationTree(),
    productionRevision: {
      buildRef: "main",
      buildMetaEtag: "c55b6a3010ca43473a4e753ad8d511bb",
      observedAt: "2026-08-23T05:44:36.000Z"
    }
  };
  writeFileSync(`${target}.json`, `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx" });
}

export async function compareVisualPage(page: Page, testInfo: TestInfo, visual: VisualState, options: {
  fullPage?: boolean;
  maxViewportDiffPixels?: number;
  referenceProjectionCss?: string;
} = {}) {
  const captures = [
    { suffix: "viewport" as const, fullPage: false },
    { suffix: "full-page" as const, fullPage: true },
  ].filter((capture) => capture.fullPage === false || options.fullPage !== false);
  for (const capture of captures) {
    const parts = artifactParts(testInfo, visual, capture.suffix);
    const buffer = await page.screenshot({ fullPage: capture.fullPage, animations: "disabled", caret: "hide" });
    const reference = artifactPath("reference-production", parts);

    if (captureProduction) {
      writeReference(buffer, reference, page, testInfo, visual);
      continue;
    }
    if (!existsSync(reference)) {
      throw new Error(`Missing immutable production reference. Run the explicit capture command: ${path.relative(repositoryRoot, reference)}`);
    }

    const candidate = artifactPath("candidate-next", parts);
    mkdirSync(path.dirname(candidate), { recursive: true });
    writeFileSync(candidate, buffer);
    let comparisonBuffer = buffer;
    if (options.referenceProjectionCss) {
      const projectionStyle = await page.addStyleTag({ content: options.referenceProjectionCss });
      comparisonBuffer = await page.screenshot({ fullPage: capture.fullPage, animations: "disabled", caret: "hide" });
      await projectionStyle.evaluate((node) => (node as HTMLElement).remove());
      const projection = artifactPath("accessibility-pre-correction-projection", parts);
      mkdirSync(path.dirname(projection), { recursive: true });
      writeFileSync(projection, comparisonBuffer);
    }
    testInfo.annotations.push({
      type: "visual-artifact",
      description: JSON.stringify({ diff: artifactPath("diffs", parts), suffix: capture.suffix }),
    });
    const { browserName } = projectMetadata(testInfo);
    const maxDiffPixels = browserName === "chromium" && capture.suffix === "viewport" ? (options.maxViewportDiffPixels ?? 4) : 0;
    expect.soft(comparisonBuffer).toMatchSnapshot(parts, { maxDiffPixels, threshold: 0 });
  }
}
