import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { prepareVisualPage, type VisualState } from "./parity";

const repositoryRoot = path.resolve(__dirname, "../../../..");
const evidenceRoot = path.join(repositoryRoot, "docs/migration-evidence/visual-parity");
const states: VisualState[] = [
  // @visual-id visual:editorial:assurance:light
  { id: "assurance", route: "/assurance.html", state: "light", theme: "light" },
  // @visual-id visual:editorial:assurance:dark
  { id: "assurance", route: "/assurance.html", state: "dark", theme: "dark" },
];

type Region = { name: string; x: number; y: number; width: number; height: number };

function projectMetadata(testInfo: TestInfo) {
  const metadata = testInfo.project.metadata as Record<string, unknown>;
  return { browserName: String(metadata.browserName), viewportName: String(metadata.viewportName) };
}

async function approvedRegions(page: Page): Promise<Region[]> {
  return page.locator('.assurance-hero h1, .assurance-state[data-evidence-state="verified"] .assurance-state-index, .assurance-state[data-evidence-state="verified"] dt').evaluateAll((nodes) => nodes.map((node, index) => {
    const rect = node.getBoundingClientRect();
    return {
      name: index === 0 ? "assurance-hero-heading" : `verified-state-label-${index}`,
      x: Math.floor(rect.left + window.scrollX) - 2,
      y: Math.floor(rect.top + window.scrollY) - 2,
      width: Math.ceil(rect.width) + 4,
      height: Math.ceil(rect.height) + 4,
    };
  }));
}

function contains(region: Region, x: number, y: number) {
  return x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
}

async function compareWithinApprovedRegions(baseline: Buffer, corrected: Buffer, regions: Region[]) {
  const [before, after] = await Promise.all([
    sharp(baseline).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(corrected).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(after.info.width).toBe(before.info.width);
  expect(after.info.height).toBe(before.info.height);

  const diff = Buffer.alloc(after.data.length);
  const regionPixels = Object.fromEntries(regions.map((region) => [region.name, 0]));
  let changedPixels = 0;
  let outsideApprovedRegions = 0;
  for (let offset = 0; offset < after.data.length; offset += 4) {
    if (before.data[offset] === after.data[offset]
      && before.data[offset + 1] === after.data[offset + 1]
      && before.data[offset + 2] === after.data[offset + 2]
      && before.data[offset + 3] === after.data[offset + 3]) continue;
    changedPixels += 1;
    const pixel = offset / 4;
    const x = pixel % after.info.width;
    const y = Math.floor(pixel / after.info.width);
    const region = regions.find((candidate) => contains(candidate, x, y));
    if (region) regionPixels[region.name] += 1;
    else outsideApprovedRegions += 1;
    diff[offset] = region ? 255 : 220;
    diff[offset + 1] = region ? 90 : 0;
    diff[offset + 2] = region ? 31 : 0;
    diff[offset + 3] = 255;
  }

  return {
    changedPixels,
    outsideApprovedRegions,
    regionPixels,
    diffPng: await sharp(diff, { raw: { width: after.info.width, height: after.info.height, channels: 4 } }).png().toBuffer(),
  };
}

for (const visual of states) {
  test(`accessibility-corrected Assurance ${visual.state} changes only approved contrast regions`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    const regions = await approvedRegions(page);
    const { browserName, viewportName } = projectMetadata(testInfo);

    for (const capture of [
      { suffix: "viewport", fullPage: false },
      { suffix: "full-page", fullPage: true },
    ] as const) {
      const filename = `${visual.state}-${capture.suffix}.png`;
      const parts = [browserName, viewportName, visual.id, filename];
      const baselinePath = path.join(evidenceRoot, "candidate-next", ...parts);
      expect(existsSync(baselinePath), `Missing preserved pre-correction candidate ${baselinePath}`).toBe(true);

      const corrected = await page.screenshot({ fullPage: capture.fullPage, animations: "disabled", caret: "hide" });
      const reversal = await page.addStyleTag({ content: `
        [data-theme="light"] .assurance-hero h1 { color: var(--codeology-display-accent) !important; }
        [data-theme="light"] .assurance-state[data-evidence-state="verified"] .assurance-state-index,
        [data-theme="light"] .assurance-state[data-evidence-state="verified"] dt { color: var(--blueprint) !important; }
      ` });
      const projectedBaseline = await page.screenshot({ fullPage: capture.fullPage, animations: "disabled", caret: "hide" });
      await reversal.evaluate((node) => (node as HTMLElement).remove());
      const comparison = await compareWithinApprovedRegions(projectedBaseline, corrected, regions);
      expect(comparison.outsideApprovedRegions, "A screenshot pixel changed outside an approved accessibility region").toBe(0);
      if (visual.theme === "light") {
        expect(comparison.regionPixels["assurance-hero-heading"]).toBeGreaterThan(0);
        if (capture.fullPage) {
          expect(comparison.regionPixels["verified-state-label-1"]).toBeGreaterThan(0);
          expect(comparison.regionPixels["verified-state-label-2"]).toBeGreaterThan(0);
          expect(comparison.regionPixels["verified-state-label-3"]).toBeGreaterThan(0);
        }
      } else {
        expect(comparison.changedPixels).toBe(0);
      }

      const correctedPath = path.join(evidenceRoot, "accessibility-corrected", ...parts);
      const projectedBaselinePath = path.join(evidenceRoot, "accessibility-pre-correction-projection", ...parts);
      const diffPath = path.join(evidenceRoot, "accessibility-corrected-diffs", ...parts);
      mkdirSync(path.dirname(correctedPath), { recursive: true });
      mkdirSync(path.dirname(projectedBaselinePath), { recursive: true });
      mkdirSync(path.dirname(diffPath), { recursive: true });
      writeFileSync(correctedPath, corrected);
      writeFileSync(projectedBaselinePath, projectedBaseline);
      writeFileSync(diffPath, comparison.diffPng);
      writeFileSync(`${correctedPath}.json`, `${JSON.stringify({
        evidenceLabel: "accessibility-corrected",
        capturedAt: new Date().toISOString(),
        pairedPreCorrectionProjection: path.relative(repositoryRoot, projectedBaselinePath),
        preservedPreCorrectionCandidate: path.relative(repositoryRoot, baselinePath),
        immutableProductionReference: path.relative(repositoryRoot, path.join(evidenceRoot, "reference-production", ...parts)),
        correctedCapture: path.relative(repositoryRoot, correctedPath),
        diff: path.relative(repositoryRoot, diffPath),
        browserProject: browserName,
        viewport: { name: viewportName, ...testInfo.project.use.viewport },
        theme: visual.theme,
        motion: "reduced",
        capture: capture.suffix,
        changedPixels: comparison.changedPixels,
        outsideApprovedRegions: comparison.outsideApprovedRegions,
        approvedRegions: regions,
        changedPixelsByRegion: comparison.regionPixels,
        classification: "Approved: minimally darkened light-theme Assurance hero and verified-state labels only.",
      }, null, 2)}\n`);
    }
  });
}
