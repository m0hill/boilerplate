import { Context, Deferred, Effect, Exit, Fiber, Layer, Option, Scope, Stream } from "effect"
import { TestClock } from "effect/testing"
import { describe, expect, it } from "vitest"
import { RealtimeCounter } from "@/services/realtime-counter/realtime-counter"
import { SqliteCounter, SqliteCounterError } from "@/services/sqlite/counter"

const provideRealtime = (counter: SqliteCounter["Service"]) =>
  Effect.provide(RealtimeCounter.layer.pipe(Layer.provide(Layer.succeed(SqliteCounter)(counter))))

describe("Realtime counter", () => {
  it("subscribes before the initial read so a concurrent write is delivered", async () => {
    let value = 0
    let reads = 0

    await Effect.runPromise(
      Effect.gen(function* () {
        const readStarted = yield* Deferred.make<void>()
        const initialReadReleased = yield* Deferred.make<void>()
        const counter = SqliteCounter.of({
          current: () =>
            Effect.gen(function* () {
              reads += 1
              if (reads === 1) {
                yield* Deferred.succeed(readStarted, undefined)
                yield* Deferred.await(initialReadReleased)
              }
              return value
            }),
          increment: () => Effect.sync(() => (value += 1)),
        })

        yield* Effect.gen(function* () {
          const realtime = yield* RealtimeCounter
          const pull = yield* Stream.toPull(realtime.changes)
          const initial = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))

          yield* Deferred.await(readStarted)
          yield* realtime.increment
          yield* Deferred.succeed(initialReadReleased, undefined)

          expect(yield* Fiber.join(initial)).toEqual([1])
          expect(yield* pull).toEqual([1])
        }).pipe(provideRealtime(counter))
      }).pipe(Effect.scoped),
    )

    expect(reads).toBe(2)
  })

  it("coalesces queued pulses and converges by rereading durable truth", async () => {
    let value = 0
    let reads = 0
    const counter = SqliteCounter.of({
      current: () =>
        Effect.sync(() => {
          reads += 1
          return value
        }),
      increment: () => Effect.sync(() => (value += 1)),
    })

    await Effect.runPromise(
      Effect.gen(function* () {
        const realtime = yield* RealtimeCounter
        const pull = yield* Stream.toPull(realtime.changes)
        expect(yield* pull).toEqual([0])

        yield* Effect.all([realtime.increment, realtime.increment, realtime.increment])

        expect(yield* pull).toEqual([3])
      }).pipe(provideRealtime(counter), Effect.scoped),
    )

    expect(reads).toBe(2)
  })

  it("does not publish when persistence fails", async () => {
    let reads = 0
    const failure = new SqliteCounterError({ reason: "write_failed" })
    const counter = SqliteCounter.of({
      current: () =>
        Effect.sync(() => {
          reads += 1
          return 0
        }),
      increment: () => Effect.fail(failure),
    })

    await Effect.runPromise(
      Effect.gen(function* () {
        const realtime = yield* RealtimeCounter
        const pull = yield* Stream.toPull(realtime.changes)
        expect(yield* pull).toEqual([0])

        expect(yield* realtime.increment.pipe(Effect.flip)).toBe(failure)
        const next = yield* pull.pipe(
          Effect.timeoutOption("1 second"),
          Effect.forkChild({ startImmediately: true }),
        )
        yield* TestClock.adjust("1 second")
        expect(Option.isNone(yield* Fiber.join(next))).toBe(true)
      }).pipe(provideRealtime(counter), Effect.scoped, Effect.provide(TestClock.layer())),
    )

    expect(reads).toBe(1)
  })

  it("shuts down active change streams with the service layer", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const readStarted = yield* Deferred.make<void>()
        const counter = SqliteCounter.of({
          current: () => Deferred.succeed(readStarted, undefined).pipe(Effect.as(0)),
          increment: () => Effect.succeed(1),
        })
        const layerScope = yield* Scope.make()
        const context = yield* Layer.buildWithScope(
          RealtimeCounter.layer.pipe(Layer.provide(Layer.succeed(SqliteCounter)(counter))),
          layerScope,
        )
        const realtime = Context.get(context, RealtimeCounter)
        const changes = yield* Stream.runCollect(realtime.changes).pipe(
          Effect.forkChild({ startImmediately: true }),
        )

        yield* Deferred.await(readStarted)
        yield* Scope.close(layerScope, Exit.void)

        expect(yield* Fiber.join(changes)).toEqual([0])
      }),
    )
  })
})
