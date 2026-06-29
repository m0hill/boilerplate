import { existsSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

if (existsSync(".env")) {
  process.loadEnvFile(".env")
}

const readEnv = (name: string): string | undefined => {
  const value = process.env[name]
  return value === undefined || value.trim() === "" ? undefined : value
}

const readD1HttpCredentials = () => {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID")
  const databaseId = readEnv("CLOUDFLARE_DATABASE_ID")
  const token = readEnv("CLOUDFLARE_D1_TOKEN")

  if (accountId === undefined && databaseId === undefined && token === undefined) {
    return undefined
  }

  if (accountId === undefined || databaseId === undefined || token === undefined) {
    throw new Error(
      "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_D1_TOKEN to use Drizzle Kit against remote D1.",
    )
  }

  return { accountId, databaseId, token }
}

const d1Credentials = readD1HttpCredentials()

export default defineConfig(
  d1Credentials === undefined
    ? {
        schema: "./src/resources/d1/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        strict: true,
        verbose: true,
      }
    : {
        schema: "./src/resources/d1/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        driver: "d1-http",
        dbCredentials: d1Credentials,
        strict: true,
        verbose: true,
      },
)
