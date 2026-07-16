import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite"
import { migrate } from "drizzle-orm/node-sqlite/migrator"
import { readMigrationFiles } from "drizzle-orm/migrator"
import { Context, Effect, Layer, Schema } from "effect"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { ServerConfig } from "@/server/config"

export const sqliteMigrationsFolder = "migrations/sqlite"

const MigrationRow = Schema.Struct({
  name: Schema.String,
  hash: Schema.String,
})

export class SqliteDatabaseError extends Schema.TaggedErrorClass<SqliteDatabaseError>()(
  "SqliteDatabaseError",
  {
    reason: Schema.Literals(["open_failed", "migration_failed", "schema_not_ready"]),
    message: Schema.String,
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

export class SqliteDatabase extends Context.Service<
  SqliteDatabase,
  {
    readonly client: DatabaseSync
    readonly drizzle: NodeSQLiteDatabase
  }
>()("boilerplate/services/sqlite/SqliteDatabase") {}

const schemaNotReady = (databasePath: string, cause?: unknown) =>
  new SqliteDatabaseError({
    reason: "schema_not_ready",
    message: `SQLite schema at ${databasePath} is missing or outdated. Run \`nub run db:migrate\`.`,
    ...(cause === undefined ? {} : { cause }),
  })

const validateSchemaReadiness = (client: DatabaseSync, databasePath: string) =>
  Effect.gen(function* () {
    const localMigrations = yield* Effect.try({
      try: () => readMigrationFiles({ migrationsFolder: sqliteMigrationsFolder }),
      catch: (cause) => schemaNotReady(databasePath, cause),
    })

    const storedRows = yield* Effect.try({
      try: () => {
        const migrationTable = client
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
          )
          .get()
        if (migrationTable === undefined) throw new Error("migration table is missing")

        client.prepare('SELECT 1 FROM "counters" LIMIT 1').get()
        return client
          .prepare('SELECT name, hash FROM "__drizzle_migrations" ORDER BY created_at, id')
          .all()
      },
      catch: (cause) => schemaNotReady(databasePath, cause),
    })

    const appliedMigrations = yield* Schema.decodeUnknownEffect(Schema.Array(MigrationRow))(
      storedRows,
    ).pipe(Effect.mapError((cause) => schemaNotReady(databasePath, cause)))

    const isCurrent =
      appliedMigrations.length === localMigrations.length &&
      localMigrations.every(
        (migration, index) =>
          appliedMigrations[index]?.name === migration.name &&
          appliedMigrations[index]?.hash === migration.hash,
      )

    if (!isCurrent) return yield* Effect.fail(schemaNotReady(databasePath))
  })

const makeSqliteDatabaseLayer = (readiness: "validate" | "migration") =>
  Layer.effect(
    SqliteDatabase,
    Effect.gen(function* () {
      const config = yield* ServerConfig

      if (config.databasePath !== ":memory:") {
        yield* Effect.try({
          try: () => mkdirSync(dirname(config.databasePath), { recursive: true }),
          catch: (cause) =>
            new SqliteDatabaseError({
              reason: "open_failed",
              message: `Could not create the SQLite directory for ${config.databasePath}.`,
              cause,
            }),
        })
      }

      const client = yield* Effect.acquireRelease(
        Effect.try({
          try: () => new DatabaseSync(config.databasePath),
          catch: (cause) =>
            new SqliteDatabaseError({
              reason: "open_failed",
              message: `Could not open SQLite database at ${config.databasePath}.`,
              cause,
            }),
        }),
        (client) => Effect.sync(() => client[Symbol.dispose]()),
      )
      const database = SqliteDatabase.of({ client, drizzle: drizzle({ client }) })

      if (readiness === "validate") {
        yield* validateSchemaReadiness(client, config.databasePath)
      }

      return database
    }),
  )

export const sqliteDatabaseLayer = makeSqliteDatabaseLayer("validate")
export const sqliteMigrationDatabaseLayer = makeSqliteDatabaseLayer("migration")

export const migrateSqlite = Effect.gen(function* () {
  const database = yield* SqliteDatabase

  yield* Effect.try({
    try: () => migrate(database.drizzle, { migrationsFolder: sqliteMigrationsFolder }),
    catch: (cause) =>
      new SqliteDatabaseError({
        reason: "migration_failed",
        message: "Could not apply SQLite migrations.",
        cause,
      }),
  })
}).pipe(Effect.withSpan("SqliteDatabase.migrate"))
