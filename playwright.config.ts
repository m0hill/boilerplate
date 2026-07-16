import { defineConfig, devices } from "@playwright/test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const PORT = 8787
const baseURL = `http://localhost:${PORT}`
const databaseDirectory = mkdtempSync(join(tmpdir(), "boilerplate-playwright-"))
const databasePath = join(databaseDirectory, "app.db")

process.once("exit", () => rmSync(databaseDirectory, { recursive: true, force: true }))

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
    command: `nub run build && nub run db:migrate && nub run start`,
    env: { ...process.env, PORT: String(PORT), DATABASE_PATH: databasePath },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGINT", timeout: 1_000 },
  },
})
