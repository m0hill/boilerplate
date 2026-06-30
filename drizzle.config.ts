import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/resources/d1/schema.ts",
  out: "./migrations/drizzle",
  dialect: "sqlite",
  strict: true,
  verbose: true,
})
