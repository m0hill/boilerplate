import { eq, sql } from "drizzle-orm"
import { Context, Effect, Schema } from "effect"
import type { D1Database } from "@/resources/d1/database"
import { d1CounterRowSchema, d1Counters } from "@/resources/d1/counter-schema"

const countKey = "main"

export class D1CounterError extends Schema.TaggedErrorClass<D1CounterError>()("D1CounterError", {
  reason: Schema.Literals(["read_failed", "write_failed", "invalid_row"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

const decodeCounterRow = (row: unknown) =>
  Schema.decodeUnknownEffect(d1CounterRowSchema)(row).pipe(
    Effect.mapError((cause) => new D1CounterError({ reason: "invalid_row", cause })),
  )

export class D1Counter extends Context.Service<
  D1Counter,
  {
    readonly current: Effect.Effect<number, D1CounterError>
    readonly increment: Effect.Effect<number, D1CounterError>
  }
>()("boilerplate/resources/d1/D1Counter") {}

export function makeD1Counter(database: D1Database): D1Counter["Service"] {
  const current = Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => database.select().from(d1Counters).where(eq(d1Counters.name, countKey)).limit(1),
      catch: (cause) => new D1CounterError({ reason: "read_failed", cause }),
    })

    const row = rows[0]
    if (row === undefined) return 0

    const decoded = yield* decodeCounterRow(row)
    return decoded.value
  }).pipe(Effect.withSpan("D1Counter.current"))

  const increment = Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        database
          .insert(d1Counters)
          .values({ name: countKey, value: 1 })
          .onConflictDoUpdate({
            target: d1Counters.name,
            set: { value: sql`${d1Counters.value} + 1` },
          })
          .returning(),
      catch: (cause) => new D1CounterError({ reason: "write_failed", cause }),
    })

    const row = rows[0]
    if (row === undefined) {
      return yield* Effect.fail(
        new D1CounterError({
          reason: "write_failed",
          cause: "D1 did not return a counter row",
        }),
      )
    }

    const decoded = yield* decodeCounterRow(row)
    return decoded.value
  }).pipe(Effect.withSpan("D1Counter.increment"))

  return D1Counter.of({ current, increment })
}
