import { Effect, Schema } from "effect"
import { CloudflareEnv } from "../../cloudflare-env.js"

/** Reading or writing the counter in KV failed. */
export class CounterStoreError extends Schema.TaggedErrorClass<CounterStoreError>()(
  "CounterStoreError",
  {
    reason: Schema.Literals(["read_failed", "write_failed"]),
  },
) {}

const COUNT_KEY = "count"

const parseCount = (raw: string | null): number => {
  if (raw === null) return 0
  const value = Number.parseInt(raw, 10)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

/** Reads the current counter value from KV (`0` when unset). */
export const currentCount: Effect.Effect<number, CounterStoreError, CloudflareEnv> = Effect.gen(
  function* () {
    const { COUNTER_KV } = yield* CloudflareEnv
    const raw = yield* Effect.tryPromise({
      try: () => COUNTER_KV.get(COUNT_KEY),
      catch: () => new CounterStoreError({ reason: "read_failed" }),
    })
    return parseCount(raw)
  },
)

/**
 * Increments the counter and returns the new value.
 *
 * Read-modify-write is not atomic — Workers KV is eventually consistent and has
 * no compare-and-set — which is fine for a demo counter. Reach for a Durable
 * Object if you need exactly-once increments.
 */
export const incrementCount: Effect.Effect<number, CounterStoreError, CloudflareEnv> = Effect.gen(
  function* () {
    const next = (yield* currentCount) + 1
    const { COUNTER_KV } = yield* CloudflareEnv
    yield* Effect.tryPromise({
      try: () => COUNTER_KV.put(COUNT_KEY, String(next)),
      catch: () => new CounterStoreError({ reason: "write_failed" }),
    })
    return next
  },
)
