import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/resources/chat-room/schema.ts",
  out: "./drizzle-do",
  dialect: "sqlite",
  driver: "durable-sqlite",
})
