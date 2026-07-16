import { Effect, Layer } from "effect"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it } from "vitest"
import { ServerConfig } from "@/server/config"
import { SqliteCounter, SqliteCounterError } from "@/services/sqlite/counter"
import {
  migrateSqlite,
  sqliteDatabaseLayer,
  sqliteMigrationDatabaseLayer,
} from "@/services/sqlite/database"

const temporaryDirectories: string[] = []

const temporaryDatabasePath = () => {
  const directory = mkdtempSync(join(tmpdir(), "boilerplate-counter-"))
  temporaryDirectories.push(directory)
  return join(directory, "app.db")
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

const runCounter = <A, E>(databasePath: string, effect: Effect.Effect<A, E, SqliteCounter>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        SqliteCounter.layer.pipe(
          Layer.provide(sqliteDatabaseLayer),
          Layer.provide(configLayer(databasePath)),
        ),
      ),
    ),
  )

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("SQLite counter", () => {
  it("reads zero, increments, and persists across database scopes", async () => {
    const databasePath = temporaryDatabasePath()
    await migrateDatabase(databasePath)

    await expect(
      runCounter(
        databasePath,
        Effect.gen(function* () {
          const counter = yield* SqliteCounter
          return [yield* counter.current, yield* counter.increment, yield* counter.increment]
        }),
      ),
    ).resolves.toEqual([0, 1, 2])

    await expect(
      runCounter(
        databasePath,
        Effect.gen(function* () {
          const counter = yield* SqliteCounter
          return yield* counter.current
        }),
      ),
    ).resolves.toBe(2)
  })

  it("rejects an invalid stored row at the database boundary", async () => {
    const databasePath = temporaryDatabasePath()
    await migrateDatabase(databasePath)
    const client = new DatabaseSync(databasePath)
    client.exec("INSERT INTO counters (name, value) VALUES ('main', -1)")
    client.close()

    const error = await runCounter(
      databasePath,
      Effect.gen(function* () {
        const counter = yield* SqliteCounter
        return yield* counter.current.pipe(Effect.flip)
      }),
    )

    expect(error).toBeInstanceOf(SqliteCounterError)
    expect(error).toMatchObject({ reason: "invalid_row" })
  })
})
