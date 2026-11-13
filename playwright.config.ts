import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/playwright-*.spec.ts",
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: "msedge",
    headless: true,
    actionTimeout: 30000,
    navigationTimeout: 90000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "edge",
      use: {
        channel: "msedge",
        headless: true,
      },
    },
  ],
});
