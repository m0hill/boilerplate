import { Context, Effect, Schema } from "effect"

const countKey = "count"

type CounterNamespace = CloudflareBindings["COUNTER_KV"]

export class KvCounterStoreError extends Schema.TaggedErrorClass<KvCounterStoreError>()(
  "KvCounterStoreError",
  {
    reason: Schema.Literals(["read_failed", "write_failed"]),
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

const parseCount = (raw: string | null): number => {
  if (raw === null) return 0
  const value = Number.parseInt(raw, 10)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

export class KvCounterStore extends Context.Service<
  KvCounterStore,
  {
    readonly current: Effect.Effect<number, KvCounterStoreError>
    readonly increment: Effect.Effect<number, KvCounterStoreError>
  }
>()("boilerplate/pages/kv-demo/KvCounterStore") {}

export function makeKvCounterStore(counterKv: CounterNamespace): KvCounterStore["Service"] {
  const current = Effect.gen(function* () {
    const raw = yield* Effect.tryPromise({
      try: () => counterKv.get(countKey),
      catch: (cause) => new KvCounterStoreError({ reason: "read_failed", cause }),
    })
    return parseCount(raw)
  }).pipe(Effect.withSpan("KvCounterStore.current"))

  const increment = Effect.gen(function* () {
    const next = (yield* current) + 1
    yield* Effect.tryPromise({
      try: () => counterKv.put(countKey, String(next)),
      catch: (cause) => new KvCounterStoreError({ reason: "write_failed", cause }),
    })
    return next
  }).pipe(Effect.withSpan("KvCounterStore.increment"))

  return KvCounterStore.of({ current, increment })
}
