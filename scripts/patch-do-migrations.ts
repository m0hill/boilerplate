import { readFile, writeFile } from "node:fs/promises"

const migrationsFile = "migrations/drizzle-do/migrations.js"
const source = await readFile(migrationsFile, "utf8")
const next = source.replace(/(from\s+["'][^"']+\.sql)(?!\?raw)(["'])/gu, "$1?raw$2")

if (next !== source) {
  await writeFile(migrationsFile, next)
}
