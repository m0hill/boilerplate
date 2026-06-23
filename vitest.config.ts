import { cloudflareTest } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/server.tsx",
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    exclude: ["dist/**", "node_modules/**", "repos/**", "**/*.e2e.ts"],
  },
})
