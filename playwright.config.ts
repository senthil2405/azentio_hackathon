import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: { command: "npm run start -- -p 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
