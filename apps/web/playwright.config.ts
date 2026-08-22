import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "python3 -m uvicorn app.main:app --app-dir ../api --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory ../../site",
      url: "http://127.0.0.1:4173/index.html",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174/components",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
