import { defineConfig, type Project } from "@playwright/test";

const captureProduction = process.env.CODEOLOGY_CAPTURE_PRODUCTION === "1";
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

const projects: Project[] = (["chromium", "webkit"] as const).flatMap((browserName) =>
  viewports.map(({ name, width, height }) => ({
    name: `${browserName}-${name}`,
    use: {
      browserName,
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale: "en-AU",
      timezoneId: "Australia/Melbourne",
      colorScheme: "light" as const,
      reducedMotion: "reduce" as const,
    },
    metadata: { browserName, viewportName: name, width, height },
  })),
);

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["./tests/visual/visual-artifact-reporter.ts"]],
  outputDir: "test-results/visual",
  snapshotPathTemplate: "../../docs/migration-evidence/visual-parity/reference-production/{arg}{ext}",
  expect: {
    toMatchSnapshot: {
      maxDiffPixels: 0,
      threshold: 0,
    },
  },
  use: {
    baseURL: captureProduction ? "https://learn.akshatporwal.dev" : "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects,
  webServer: captureProduction ? undefined : [
    {
      command: "node scripts/legacy-static-server.mjs",
      url: "http://127.0.0.1:4173/prereqs.html",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "node ../../scripts/build-auth.mjs && node ../../site/build.js && cross-env CODEOLOGY_ENABLE_FIXTURES=1 npm run build && npm run start -- --hostname 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174/components",
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
});
