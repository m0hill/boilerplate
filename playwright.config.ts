import { defineConfig, devices } from "@playwright/test"

const PORT = 8787
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `nub run build && PORT=${PORT} nub run start`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGINT", timeout: 1_000 },
  },
})
