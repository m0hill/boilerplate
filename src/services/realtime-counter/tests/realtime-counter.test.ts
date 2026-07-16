import { Effect, Layer, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { RealtimeCounter } from "@/services/realtime-counter/realtime-counter"
import { SqliteCounter, SqliteCounterError } from "@/services/sqlite/counter"

const runRealtime = <A>(
  counter: SqliteCounter["Service"],
  test: (realtime: RealtimeCounter["Service"]) => Promise<A>,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const realtime = yield* RealtimeCounter
      return yield* Effect.promise(() => test(realtime))
    }).pipe(
      Effect.provide(RealtimeCounter.layer),
      Effect.provide(Layer.succeed(SqliteCounter)(counter)),
    ),
  )

describe("Realtime counter", () => {
  it("subscribes before the initial read so a concurrent write is delivered", async () => {
    let value = 0
    let releaseInitialRead = () => {}
    let markReadStarted = () => {}
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve
    })
    const initialReadReleased = new Promise<void>((resolve) => {
      releaseInitialRead = resolve
    })
    let reads = 0

    await runRealtime(
      SqliteCounter.of({
        current: () =>
          Effect.promise(async () => {
            reads += 1
            if (reads === 1) {
              markReadStarted()
              await initialReadReleased
            }
            return value
          }),
        increment: () => Effect.sync(() => (value += 1)),
      }),
      async (realtime) => {
        const iterable = Stream.toAsyncIterable(realtime.changes)
        const iterator = iterable[Symbol.asyncIterator]()
        const initial = iterator.next()

        await readStarted
        await Effect.runPromise(realtime.increment)
        releaseInitialRead()

        await expect(initial).resolves.toMatchObject({ done: false, value: 1 })
        await expect(iterator.next()).resolves.toMatchObject({ done: false, value: 1 })
        await iterator.return?.()
      },
    )

    expect(reads).toBe(2)
  })

  it("coalesces queued pulses and converges by rereading durable truth", async () => {
    let value = 0
    let reads = 0

    await runRealtime(
      SqliteCounter.of({
        current: () =>
          Effect.sync(() => {
            reads += 1
            return value
          }),
        increment: () => Effect.sync(() => (value += 1)),
      }),
      async (realtime) => {
        const iterable = Stream.toAsyncIterable(realtime.changes)
        const iterator = iterable[Symbol.asyncIterator]()
        await expect(iterator.next()).resolves.toMatchObject({ done: false, value: 0 })

        await Effect.runPromise(
          Effect.all([realtime.increment, realtime.increment, realtime.increment]),
        )

        await expect(iterator.next()).resolves.toMatchObject({ done: false, value: 3 })
        await iterator.return?.()
      },
    )

    expect(reads).toBe(2)
  })

  it("does not publish when persistence fails", async () => {
    let reads = 0
    const failure = new SqliteCounterError({ reason: "write_failed" })

    await runRealtime(
      SqliteCounter.of({
        current: () =>
          Effect.sync(() => {
            reads += 1
            return 0
          }),
        increment: () => Effect.fail(failure),
      }),
      async (realtime) => {
        const iterable = Stream.toAsyncIterable(realtime.changes)
        const iterator = iterable[Symbol.asyncIterator]()
        await iterator.next()

        await expect(Effect.runPromise(realtime.increment)).rejects.toBe(failure)
        const next = iterator.next()
        const outcome = await Promise.race([
          next.then(() => "pulse"),
          new Promise<"quiet">((resolve) => setTimeout(() => resolve("quiet"), 20)),
        ])
        expect(outcome).toBe("quiet")
        expect(reads).toBe(1)
        await iterator.return?.()
        await next.catch(() => {})
      },
    )
  })
})
