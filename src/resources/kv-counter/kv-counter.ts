import { Context, Effect, Schema } from "effect"

const countKey = "count"

export class KvCounterError extends Schema.TaggedErrorClass<KvCounterError>()("KvCounterError", {
  reason: Schema.Literals(["read_failed", "write_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

const parseCount = (raw: string | null): number => {
  if (raw === null) return 0
  const value = Number.parseInt(raw, 10)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

export class KvCounter extends Context.Service<
  KvCounter,
  {
    readonly current: Effect.Effect<number, KvCounterError>
    readonly increment: Effect.Effect<number, KvCounterError>
  }
>()("boilerplate/resources/kv-counter/KvCounter") {}

export function makeKvCounter(counterKv: CloudflareBindings["COUNTER_KV"]): KvCounter["Service"] {
  const current = Effect.gen(function* () {
    const raw = yield* Effect.tryPromise({
      try: () => counterKv.get(countKey),
      catch: (cause) => new KvCounterError({ reason: "read_failed", cause }),
    })
    return parseCount(raw)
  }).pipe(Effect.withSpan("KvCounter.current"))

  const increment = Effect.gen(function* () {
    const next = (yield* current) + 1
    yield* Effect.tryPromise({
      try: () => counterKv.put(countKey, String(next)),
      catch: (cause) => new KvCounterError({ reason: "write_failed", cause }),
    })
    return next
  }).pipe(Effect.withSpan("KvCounter.increment"))

  return KvCounter.of({ current, increment })
}
