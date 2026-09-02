import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const repositoryRoot = path.resolve(__dirname, "../../../..");
const evidenceRoot = path.join(repositoryRoot, "docs/migration-evidence/visual-parity");

type Region = { name: string; x: number; y: number; width: number; height: number };
type Surface = { id: "legacy" | "next"; url: string };
type Capture = { id: string; root: string; approved: string; classification: string };

const surfaces: Surface[] = [
  { id: "legacy", url: "http://127.0.0.1:4173/prereqs.html" },
  { id: "next", url: "http://127.0.0.1:4174/roadmap" },
];

const captures: Capture[] = [
  {
    id: "graph-footer",
    root: ".roadmap-graph-footer",
    approved: ".roadmap-legend-item, .roadmap-graph-hint",
    classification: "Approved: minimally darkened light-theme Skill Map legend and graph-hint text only; maintained legacy and Next share the correction.",
  },
  {
    id: "default-inspector",
    root: "#roadmapInspector",
    approved: ".roadmap-recommendation > span",
    classification: "Approved: minimally darkened the light-theme Skill Map recommendation label only; maintained legacy and Next share the correction.",
  },
];

function projectMetadata(testInfo: TestInfo) {
  const metadata = testInfo.project.metadata as Record<string, unknown>;
  return { browserName: String(metadata.browserName), viewportName: String(metadata.viewportName) };
}

async function prepareSurface(page: Page, surface: Surface, theme: "light" | "dark") {
  await page.addInitScript((selectedTheme) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("theme", selectedTheme);
    document.documentElement.dataset.theme = selectedTheme;
  }, theme);
  await page.goto(surface.url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll(".roadmap-node").length === 20);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      caret-color: transparent !important;
      animation-play-state: paused !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  ` });
}

async function approvedRegions(page: Page, capture: Capture): Promise<Region[]> {
  return page.locator(capture.approved).evaluateAll((nodes, rootSelector) => {
    const root = document.querySelector(String(rootSelector))!.getBoundingClientRect();
    return nodes.map((node, index) => {
      const rect = node.getBoundingClientRect();
      return {
        name: node.classList.contains("roadmap-graph-hint")
          ? "graph-hint"
          : node.classList.contains("roadmap-recommendation") ? "recommendation-label" : `approved-${index + 1}`,
        x: Math.floor(rect.left - root.left) - 5,
        y: Math.floor(rect.top - root.top) - 5,
        width: Math.ceil(rect.width) + 10,
        height: Math.ceil(rect.height) + 10,
      };
    });
  }, capture.root);
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
  const changedPixelsByRegion = Object.fromEntries(regions.map((region) => [region.name, 0]));
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
    if (region) changedPixelsByRegion[region.name] += 1;
    else outsideApprovedRegions += 1;
    diff[offset] = region ? 255 : 220;
    diff[offset + 1] = region ? 90 : 0;
    diff[offset + 2] = region ? 31 : 0;
    diff[offset + 3] = 255;
  }

  return {
    changedPixels,
    outsideApprovedRegions,
    changedPixelsByRegion,
    diffPng: await sharp(diff, {
      raw: { width: after.info.width, height: after.info.height, channels: 4 },
    }).png().toBuffer(),
  };
}

for (const theme of ["light", "dark"] as const) {
  test(`accessibility-corrected Skill Map ${theme} changes only approved contrast regions`, async ({ page }, testInfo) => {
    for (const surface of surfaces) {
      await prepareSurface(page, surface, theme);
      if (theme === "light") {
        await expect(page.locator(".roadmap-legend-item").first()).toHaveCSS("color", "rgb(105, 105, 105)");
        await expect(page.locator(".roadmap-graph-hint")).toHaveCSS("color", "rgb(105, 105, 105)");
        await expect(page.locator(".roadmap-recommendation > span")).toHaveCSS("color", "rgb(194, 58, 0)");
      }

      for (const capture of captures) {
        const root = page.locator(capture.root);
        await root.scrollIntoViewIfNeeded();
        const regions = await approvedRegions(page, capture);
        const clip = await root.boundingBox();
        expect(clip).not.toBeNull();
        const corrected = await page.screenshot({ animations: "disabled", caret: "hide", clip: clip! });
        const reversal = await page.addStyleTag({ content: `
          .roadmap-page {
            --roadmap-footer-ink: var(--ink-mute) !important;
            --roadmap-recommendation-ink: var(--blueprint) !important;
          }
        ` });
        const projectedBaseline = await page.screenshot({ animations: "disabled", caret: "hide", clip: clip! });
        await reversal.evaluate((node) => (node as HTMLElement).remove());
        const comparison = await compareWithinApprovedRegions(projectedBaseline, corrected, regions);
        expect(comparison.outsideApprovedRegions).toBe(0);
        if (theme === "light") {
          expect(comparison.changedPixels).toBeGreaterThan(0);
          for (const changedPixels of Object.values(comparison.changedPixelsByRegion)) {
            expect(changedPixels).toBeGreaterThan(0);
          }
        } else {
          expect(comparison.changedPixels).toBe(0);
        }

        const { browserName, viewportName } = projectMetadata(testInfo);
        const parts = [browserName, viewportName, "roadmap", `${theme}-${surface.id}-${capture.id}.png`];
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
        pairedSurface: surface.id,
        pairedPreCorrectionProjection: path.relative(repositoryRoot, projectedBaselinePath),
        immutableProductionReference: path.relative(repositoryRoot, path.join(
          evidenceRoot,
          "reference-production",
          browserName,
          viewportName,
          "roadmap",
          theme === "dark" ? "default-graph-dark-full-page.png" : "default-graph-light-full-page.png",
        )),
        correctedCapture: path.relative(repositoryRoot, correctedPath),
        diff: path.relative(repositoryRoot, diffPath),
        browserProject: browserName,
        viewport: { name: viewportName, ...testInfo.project.use.viewport },
        theme,
        motion: "reduced",
        capture: `${capture.id}-component`,
        changedPixels: comparison.changedPixels,
        outsideApprovedRegions: comparison.outsideApprovedRegions,
        approvedRegions: regions,
        changedPixelsByRegion: comparison.changedPixelsByRegion,
        classification: capture.classification,
      }, null, 2)}\n`);
      }
    }
  });
}
