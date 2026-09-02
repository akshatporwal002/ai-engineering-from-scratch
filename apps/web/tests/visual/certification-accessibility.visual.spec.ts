import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const repositoryRoot = path.resolve(__dirname, "../../../..");
const evidenceRoot = path.join(repositoryRoot, "docs/migration-evidence/visual-parity");
const surfaces = [
  { id: "legacy", url: "http://127.0.0.1:4173/certification.html?id=claude-ccao-f" },
  { id: "next", url: "http://127.0.0.1:4174/certifications/ccao-f" },
] as const;

type Region = { name: string; x: number; y: number; width: number; height: number };

function projectMetadata(testInfo: TestInfo) {
  const metadata = testInfo.project.metadata as Record<string, unknown>;
  return { browserName: String(metadata.browserName), viewportName: String(metadata.viewportName) };
}

async function prepare(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("theme", "light");
    document.documentElement.dataset.theme = "light";
  });
  await page.goto(url, { waitUntil: "load" });
  await expect(page.locator(".cert-deep-dive-row")).toHaveCount(5);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}" });
}

function contains(region: Region, x: number, y: number) {
  return x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
}

async function comparePixels(beforePng: Buffer, afterPng: Buffer, regions: Region[]) {
  const [before, after] = await Promise.all([
    sharp(beforePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(afterPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const diff = Buffer.alloc(after.data.length);
  let changedPixels = 0;
  let outsideApprovedRegions = 0;
  for (let offset = 0; offset < after.data.length; offset += 4) {
    if (before.data[offset] === after.data[offset] && before.data[offset + 1] === after.data[offset + 1]
      && before.data[offset + 2] === after.data[offset + 2] && before.data[offset + 3] === after.data[offset + 3]) continue;
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
  return { changedPixels, outsideApprovedRegions, diff: await sharp(diff, { raw: { width: after.info.width, height: after.info.height, channels: 4 } }).png().toBuffer() };
}

test("accessibility-corrected certification optional links change only approved contrast regions", async ({ page }, testInfo) => {
  for (const surface of surfaces) {
    await prepare(page, surface.url);
    for (const sample of [
      { id: "badge", selector: ".cert-deep-dive-badge" },
      { id: "link", selector: ".cert-deep-dive-row .cert-lesson-open" },
    ]) {
      const root = page.locator(sample.selector).first();
      await root.scrollIntoViewIfNeeded();
      const corrected = await root.screenshot({ animations: "disabled", caret: "hide" });
      const reversal = await page.addStyleTag({ content: ".cert-deep-dive-badge,.cert-deep-dive-row .cert-lesson-open{color:var(--blueprint)!important}" });
      const projected = await root.screenshot({ animations: "disabled", caret: "hide" });
      await reversal.evaluate((node) => (node as HTMLElement).remove());
      const metadata = await sharp(corrected).metadata();
      const regions = [{ name: sample.id, x: 0, y: 0, width: metadata.width!, height: metadata.height! }];
      const comparison = await comparePixels(projected, corrected, regions);
      expect(comparison.changedPixels).toBeGreaterThan(0);
      expect(comparison.outsideApprovedRegions).toBe(0);

      const { browserName, viewportName } = projectMetadata(testInfo);
      const parts = [browserName, viewportName, "certification-track", `light-${surface.id}-optional-${sample.id}.png`];
      const correctedPath = path.join(evidenceRoot, "accessibility-corrected", ...parts);
      const projectedPath = path.join(evidenceRoot, "accessibility-pre-correction-projection", ...parts);
      const diffPath = path.join(evidenceRoot, "accessibility-corrected-diffs", ...parts);
      for (const target of [correctedPath, projectedPath, diffPath]) mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(correctedPath, corrected);
      writeFileSync(projectedPath, projected);
      writeFileSync(diffPath, comparison.diff);
      writeFileSync(`${correctedPath}.json`, `${JSON.stringify({
        evidenceLabel: "accessibility-corrected",
        pairedSurface: surface.id,
        pairedPreCorrectionProjection: path.relative(repositoryRoot, projectedPath),
        immutableProductionReference: path.relative(repositoryRoot, path.join(evidenceRoot, "reference-production", browserName, viewportName, "certification-track", "default-light-full-page.png")),
        browserProject: browserName,
        viewport: { name: viewportName, ...testInfo.project.use.viewport },
        theme: "light",
        motion: "reduced",
        changedPixels: comparison.changedPixels,
        outsideApprovedRegions: comparison.outsideApprovedRegions,
        approvedRegions: regions,
        classification: "Approved: minimally darkened only the optional-extension badge and link ink in the maintained legacy and Next certification track.",
      }, null, 2)}\n`);
    }
  }
});
