import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: [
      "dist/**",
      "node_modules/**",
      "repos/**",
      "**/*.e2e.ts",
      "src/pages/{d1-demo,do-demo,kv-demo,live-counter,r2-demo}/**",
      "src/resources/**",
    ],
  },
})
