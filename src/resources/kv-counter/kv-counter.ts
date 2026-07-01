import { Context, Effect, Option, Schema } from "effect"

const countKey = "count"

const KvCountValue = Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))
const decodeKvCount = Schema.decodeUnknownOption(KvCountValue)

export class KvCounterError extends Schema.TaggedErrorClass<KvCounterError>()("KvCounterError", {
  reason: Schema.Literals(["read_failed", "write_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

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
    if (raw === null) return 0
    return Option.getOrElse(decodeKvCount(raw), () => 0)
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
