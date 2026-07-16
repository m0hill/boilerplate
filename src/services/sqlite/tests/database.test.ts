import { Context, Effect, Exit, Layer, Scope } from "effect"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it } from "vitest"
import { ServerConfig } from "@/server/config"
import {
  migrateSqlite,
  SqliteDatabase,
  SqliteDatabaseError,
  sqliteDatabaseLayer,
  sqliteMigrationDatabaseLayer,
} from "@/services/sqlite/database"

const temporaryDirectories: string[] = []

const temporaryDatabasePath = (nested = false) => {
  const directory = mkdtempSync(join(tmpdir(), "boilerplate-sqlite-"))
  temporaryDirectories.push(directory)
  return join(directory, ...(nested ? ["nested", "data", "app.db"] : ["app.db"]))
}

const configLayer = (databasePath: string) =>
  Layer.succeed(ServerConfig)(ServerConfig.of({ host: "127.0.0.1", port: 3000, databasePath }))

const migrateDatabase = (databasePath: string) =>
  Effect.runPromise(
    migrateSqlite.pipe(
      Effect.provide(sqliteMigrationDatabaseLayer),
      Effect.provide(configLayer(databasePath)),
    ),
  )

const buildReadyDatabase = (databasePath: string) =>
  Layer.build(sqliteDatabaseLayer.pipe(Layer.provide(configLayer(databasePath)))).pipe(
    Effect.scoped,
  )

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("SQLite database", () => {
  it("creates parent directories and applies migrations idempotently", async () => {
    const databasePath = temporaryDatabasePath(true)

    await migrateDatabase(databasePath)
    await migrateDatabase(databasePath)

    expect(existsSync(databasePath)).toBe(true)
    const client = new DatabaseSync(databasePath)
    const migrationCount = client
      .prepare('SELECT count(*) AS count FROM "__drizzle_migrations"')
      .get()
    const counterTable = client
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'counters'")
      .get()
    client.close()

    expect(migrationCount).toEqual({ count: 1 })
    expect(counterTable).toEqual({ name: "counters" })
  })

  it("rejects a missing schema with migration guidance", async () => {
    const error = await Effect.runPromise(
      buildReadyDatabase(temporaryDatabasePath()).pipe(Effect.flip),
    )

    expect(error).toBeInstanceOf(SqliteDatabaseError)
    expect(error).toMatchObject({ reason: "schema_not_ready" })
    expect(error.message).toContain("nub run db:migrate")
  })

  it("rejects an outdated migration record", async () => {
    const databasePath = temporaryDatabasePath()
    await migrateDatabase(databasePath)
    const client = new DatabaseSync(databasePath)
    client.exec("UPDATE \"__drizzle_migrations\" SET hash = 'outdated'")
    client.close()

    const error = await Effect.runPromise(buildReadyDatabase(databasePath).pipe(Effect.flip))

    expect(error).toBeInstanceOf(SqliteDatabaseError)
    expect(error).toMatchObject({ reason: "schema_not_ready" })
    expect(error.message).toContain("nub run db:migrate")
  })

  it("closes the DatabaseSync connection with its Layer scope", async () => {
    const databasePath = temporaryDatabasePath()
    await migrateDatabase(databasePath)
    const scope = Scope.makeUnsafe()
    const context = await Effect.runPromise(
      Layer.buildWithScope(
        sqliteDatabaseLayer.pipe(Layer.provide(configLayer(databasePath))),
        scope,
      ),
    )
    const database = Context.get(context, SqliteDatabase)

    expect(database.client.isOpen).toBe(true)
    await Effect.runPromise(Scope.close(scope, Exit.void))
    expect(database.client.isOpen).toBe(false)
  })
})
