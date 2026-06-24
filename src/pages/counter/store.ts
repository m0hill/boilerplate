import { Context, Effect, Schema } from "effect"

const countKey = "count"

type CounterNamespace = CloudflareBindings["COUNTER_KV"]

export class CounterStoreError extends Schema.TaggedErrorClass<CounterStoreError>()(
  "CounterStoreError",
  {
    reason: Schema.Literals(["read_failed", "write_failed"]),
  },
) {}

const parseCount = (raw: string | null): number => {
  if (raw === null) return 0
  const value = Number.parseInt(raw, 10)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

export class CounterStore extends Context.Service<
  CounterStore,
  {
    readonly current: Effect.Effect<number, CounterStoreError>
    readonly increment: Effect.Effect<number, CounterStoreError>
  }
>()("boilerplate/pages/counter/CounterStore") {}

export function makeCounterStore(counterKv: CounterNamespace): CounterStore["Service"] {
  const current = Effect.fn("CounterStore.current")(function* () {
    const raw = yield* Effect.tryPromise({
      try: () => counterKv.get(countKey),
      catch: () => new CounterStoreError({ reason: "read_failed" }),
    })
    return parseCount(raw)
  })

  const increment = Effect.fn("CounterStore.increment")(function* () {
    const next = (yield* current()) + 1
    yield* Effect.tryPromise({
      try: () => counterKv.put(countKey, String(next)),
      catch: () => new CounterStoreError({ reason: "write_failed" }),
    })
    return next
  })

  return CounterStore.of({
    current: current(),
    increment: increment(),
  })
}
