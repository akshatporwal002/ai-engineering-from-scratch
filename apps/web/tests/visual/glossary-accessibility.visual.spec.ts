import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { prepareVisualPage, type VisualState } from "./parity";

const repositoryRoot = path.resolve(__dirname, "../../../..");
const evidenceRoot = path.join(repositoryRoot, "docs/migration-evidence/visual-parity");
const states: VisualState[] = [
  { id: "glossary", route: "/glossary#backpropagation", state: "focused-details-light", theme: "light" },
  { id: "glossary", route: "/glossary#backpropagation", state: "focused-details-dark", theme: "dark" },
];

type Region = { name: string; x: number; y: number; width: number; height: number };

function projectMetadata(testInfo: TestInfo) {
  const metadata = testInfo.project.metadata as Record<string, unknown>;
  return { browserName: String(metadata.browserName), viewportName: String(metadata.viewportName) };
}

async function approvedRegions(page: Page): Promise<Region[]> {
  return page.locator("#backpropagation .glossary-details summary, #backpropagation .glossary-details .glossary-entry-label, #backpropagation .glossary-details .glossary-resource-label, #backpropagation .glossary-details .glossary-resource-link, #backpropagation .glossary-related-link").evaluateAll((nodes) => nodes.map((node, index) => {
    const entryRect = document.querySelector("#backpropagation")!.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    return { name: `approved-contrast-${index + 1}`, x: Math.floor(rect.left - entryRect.left) - 2, y: Math.floor(rect.top - entryRect.top) - 2, width: Math.ceil(rect.width) + 4, height: Math.ceil(rect.height) + 4 };
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
    const approved = regions.some((region) => contains(region, x, y));
    if (!approved) outsideApprovedRegions += 1;
    diff[offset] = approved ? 255 : 220;
    diff[offset + 1] = approved ? 90 : 0;
    diff[offset + 2] = approved ? 31 : 0;
    diff[offset + 3] = 255;
  }
  return {
    changedPixels,
    outsideApprovedRegions,
    diffPng: await sharp(diff, { raw: { width: after.info.width, height: after.info.height, channels: 4 } }).png().toBuffer(),
  };
}

for (const visual of states) {
  test(`accessibility-corrected Glossary ${visual.theme} changes only approved contrast regions`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    const entry = page.locator("#backpropagation");
    await entry.waitFor();
    await entry.evaluate((node) => {
      node.classList.add("is-focused");
      (node as HTMLElement).focus({ preventScroll: true });
      const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
      window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top - headerBottom, behavior: "auto" });
    });
    await entry.locator("details").evaluate((node) => { (node as HTMLDetailsElement).open = true; });
    await page.mouse.move(0, 0);
    const regions = await approvedRegions(page);
    const corrected = await entry.screenshot({ animations: "disabled", caret: "hide" });
    const reversal = await page.addStyleTag({ content: `
      .glossary-details summary,
      .glossary-details .glossary-resource-link,
      .glossary-related-link { color: var(--blueprint) !important; }
      .glossary-details .glossary-entry-label,
      .glossary-details .glossary-resource-label { color: var(--ink-mute) !important; }
    ` });
    const projectedBaseline = await entry.screenshot({ animations: "disabled", caret: "hide" });
    await reversal.evaluate((node) => (node as HTMLElement).remove());
    const comparison = await compareWithinApprovedRegions(projectedBaseline, corrected, regions);
    expect(comparison.outsideApprovedRegions).toBe(0);
    if (visual.theme === "light") expect(comparison.changedPixels).toBeGreaterThan(0);
    else expect(comparison.changedPixels).toBe(0);

    const { browserName, viewportName } = projectMetadata(testInfo);
    const parts = [browserName, viewportName, visual.id, `${visual.state}-component.png`];
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
      immutableProductionReference: path.relative(repositoryRoot, path.join(evidenceRoot, "reference-production", browserName, viewportName, "glossary", "deep-anchor-viewport.png")),
      correctedCapture: path.relative(repositoryRoot, correctedPath),
      diff: path.relative(repositoryRoot, diffPath),
      browserProject: browserName,
      viewport: { name: viewportName, ...testInfo.project.use.viewport },
      theme: visual.theme,
      motion: "reduced",
      capture: "focused-entry-component",
      changedPixels: comparison.changedPixels,
      outsideApprovedRegions: comparison.outsideApprovedRegions,
      approvedRegions: regions,
      classification: "Approved: minimally darkened light-theme Glossary evidence labels and links only; maintained legacy and Next share the correction.",
    }, null, 2)}\n`);
  });
}
