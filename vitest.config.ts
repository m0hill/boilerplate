import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cloudflareTest, type D1Migration } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const splitSql = (sql: string): string[] =>
  sql
    .split(/-->\s*statement-breakpoint|;\s*(?=\n|$)/u)
    .map((query) => query.trim())
    .filter((query) => query.length > 0)

const readDrizzleMigrations = async (migrationsPath: string): Promise<D1Migration[]> => {
  const entries = await readdir(migrationsPath, { withFileTypes: true })
  const migrationDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    migrationDirs.map(async (name) => {
      const sql = await readFile(path.join(migrationsPath, name, "migration.sql"), "utf8")
      return {
        name: `${name}/migration.sql`,
        queries: splitSql(sql),
      }
    }),
  )
}

export default defineConfig(async () => {
  const migrations = await readDrizzleMigrations(path.join(rootDir, "migrations", "drizzle"))

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      cloudflareTest({
        main: "./src/index.tsx",
        miniflare: {
          compatibilityDate: "2026-05-22",
          assets: { directory: "./public" },
          kvNamespaces: ["COUNTER_KV"],
          d1Databases: ["APP_DB"],
          r2Buckets: ["APP_BUCKET"],
          durableObjects: {
            CHAT_ROOM: { className: "ChatRoom", useSQLite: true },
            LIVE_ROOMS: { className: "LiveRoom", useSQLite: true },
          },
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      setupFiles: ["./src/test/d1-migrations.ts"],
      exclude: ["dist/**", "node_modules/**", "repos/**", "**/*.e2e.ts"],
    },
  }
})
