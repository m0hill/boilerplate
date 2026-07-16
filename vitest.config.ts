import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ["dist/**", "node_modules/**", "repos/**", "**/*.e2e.ts"],
  },
})
