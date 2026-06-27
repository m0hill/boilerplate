import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/pages/do-demo/schema.ts",
  out: "./drizzle-do",
  dialect: "sqlite",
  driver: "durable-sqlite",
})
