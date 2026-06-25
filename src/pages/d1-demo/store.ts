import { eq, sql } from "drizzle-orm"
import { Context, Effect, Schema } from "effect"
import type { Database } from "../../db/database.js"
import { d1CounterRowSchema, d1Counters } from "../../db/schema.js"

const countKey = "main"

export class D1CounterStoreError extends Schema.TaggedErrorClass<D1CounterStoreError>()(
  "D1CounterStoreError",
  {
    reason: Schema.Literals(["read_failed", "write_failed", "invalid_row"]),
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

const decodeCounterRow = (row: unknown) =>
  Schema.decodeUnknownEffect(d1CounterRowSchema)(row).pipe(
    Effect.mapError((cause) => new D1CounterStoreError({ reason: "invalid_row", cause })),
  )

export class D1CounterStore extends Context.Service<
  D1CounterStore,
  {
    readonly current: Effect.Effect<number, D1CounterStoreError>
    readonly increment: Effect.Effect<number, D1CounterStoreError>
  }
>()("boilerplate/pages/d1-demo/D1CounterStore") {}

export function makeD1CounterStore(database: Database["Service"]): D1CounterStore["Service"] {
  const current = Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => database.select().from(d1Counters).where(eq(d1Counters.name, countKey)).limit(1),
      catch: (cause) => new D1CounterStoreError({ reason: "read_failed", cause }),
    })

    const row = rows[0]
    if (row === undefined) return 0

    const decoded = yield* decodeCounterRow(row)
    return decoded.value
  }).pipe(Effect.withSpan("D1CounterStore.current"))

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
      catch: (cause) => new D1CounterStoreError({ reason: "write_failed", cause }),
    })

    const row = rows[0]
    if (row === undefined) {
      return yield* Effect.fail(
        new D1CounterStoreError({
          reason: "write_failed",
          cause: "D1 did not return a counter row",
        }),
      )
    }

    const decoded = yield* decodeCounterRow(row)
    return decoded.value
  }).pipe(Effect.withSpan("D1CounterStore.increment"))

  return D1CounterStore.of({ current, increment })
}
