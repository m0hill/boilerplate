import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/services/sqlite/schema.ts",
  out: "./migrations/sqlite",
  dialect: "sqlite",
  strict: true,
  verbose: true,
})
