import { Context, Effect, Layer, PubSub, Stream } from "effect"
import {
  SqliteCounter,
  type SqliteCounterError,
  sqliteCounterNames,
} from "@/services/sqlite/counter"

export class RealtimeCounter extends Context.Service<
  RealtimeCounter,
  {
    readonly changes: Stream.Stream<number, SqliteCounterError>
    readonly increment: Effect.Effect<void, SqliteCounterError>
  }
>()("boilerplate/services/realtime-counter/RealtimeCounter") {
  static readonly layer = Layer.effect(
    RealtimeCounter,
    Effect.gen(function* () {
      const counter = yield* SqliteCounter
      const pulses = yield* Effect.acquireRelease(
        PubSub.sliding<void>({ capacity: 1 }),
        PubSub.shutdown,
      )

      const changes = Stream.unwrap(
        Effect.gen(function* () {
          const subscription = yield* PubSub.subscribe(pulses)
          const initial = yield* counter.current(sqliteCounterNames.realtime)

          return Stream.make(initial).pipe(
            Stream.concat(
              Stream.fromSubscription(subscription).pipe(
                Stream.mapEffect(() => counter.current(sqliteCounterNames.realtime)),
              ),
            ),
          )
        }),
      )

      const increment = counter
        .increment(sqliteCounterNames.realtime)
        .pipe(
          Effect.andThen(PubSub.publish(pulses, undefined)),
          Effect.asVoid,
          Effect.withSpan("RealtimeCounter.increment"),
        )

      return RealtimeCounter.of({ changes, increment })
    }),
  )
}
