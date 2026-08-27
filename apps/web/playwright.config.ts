import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "python3 -m uvicorn app.main:app --app-dir ../api --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "node scripts/legacy-static-server.mjs",
      url: "http://127.0.0.1:4173/index.html",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "CODEOLOGY_ENABLE_FIXTURES=1 npm run build && npm run start -- --hostname 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174/components",
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
});
