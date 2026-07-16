import { eq, sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { SqliteDatabase } from "@/services/sqlite/database"
import { sqliteCounterRowSchema, sqliteCounters } from "@/services/sqlite/schema"

export const sqliteCounterNames = {
  sqlite: "main",
  realtime: "realtime",
} as const

export type SqliteCounterName = (typeof sqliteCounterNames)[keyof typeof sqliteCounterNames]

export class SqliteCounterError extends Schema.TaggedErrorClass<SqliteCounterError>()(
  "SqliteCounterError",
  {
    reason: Schema.Literals(["read_failed", "write_failed", "invalid_row"]),
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

const decodeCounterRow = (row: unknown) =>
  Schema.decodeUnknownEffect(sqliteCounterRowSchema)(row).pipe(
    Effect.mapError((cause) => new SqliteCounterError({ reason: "invalid_row", cause })),
  )

export class SqliteCounter extends Context.Service<
  SqliteCounter,
  {
    readonly current: (name: SqliteCounterName) => Effect.Effect<number, SqliteCounterError>
    readonly increment: (name: SqliteCounterName) => Effect.Effect<number, SqliteCounterError>
  }
>()("boilerplate/services/sqlite/SqliteCounter") {
  static readonly layer = Layer.effect(
    SqliteCounter,
    Effect.gen(function* () {
      const database = yield* SqliteDatabase

      const current = (name: SqliteCounterName) =>
        Effect.gen(function* () {
          const rows = yield* Effect.try({
            try: () =>
              database.drizzle
                .select()
                .from(sqliteCounters)
                .where(eq(sqliteCounters.name, name))
                .limit(1)
                .all(),
            catch: (cause) => new SqliteCounterError({ reason: "read_failed", cause }),
          })
          const row = rows[0]
          if (row === undefined) return 0

          const decoded = yield* decodeCounterRow(row)
          return decoded.value
        }).pipe(Effect.withSpan("SqliteCounter.current", { attributes: { name } }))

      const increment = (name: SqliteCounterName) =>
        Effect.gen(function* () {
          const rows = yield* Effect.try({
            try: () =>
              database.drizzle
                .insert(sqliteCounters)
                .values({ name, value: 1 })
                .onConflictDoUpdate({
                  target: sqliteCounters.name,
                  set: { value: sql`${sqliteCounters.value} + 1` },
                })
                .returning()
                .all(),
            catch: (cause) => new SqliteCounterError({ reason: "write_failed", cause }),
          })
          const row = rows[0]
          if (row === undefined) {
            return yield* Effect.fail(
              new SqliteCounterError({
                reason: "write_failed",
                cause: "SQLite did not return a counter row",
              }),
            )
          }

          const decoded = yield* decodeCounterRow(row)
          return decoded.value
        }).pipe(Effect.withSpan("SqliteCounter.increment", { attributes: { name } }))

      return SqliteCounter.of({ current, increment })
    }),
  )
}
