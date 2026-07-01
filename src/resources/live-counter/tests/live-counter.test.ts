import { env } from "cloudflare:workers"
import { Context, Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { makeD1Counter, D1Counter } from "@/resources/d1/counter"
import { makeD1Database } from "@/resources/d1/database"
import {
  liveCounterCurrent,
  liveCounterIncrement,
  liveCounterSubscribe,
} from "@/resources/live-counter/live-counter"
import { LiveRooms, makeLiveRooms } from "@/resources/live-rooms/live-rooms"

beforeEach(async () => {
  await env.APP_DB.prepare("DELETE FROM d1_counters").run()
})

const liveCounterContext = () => {
  const database = makeD1Database(env.APP_DB)

  return Context.empty().pipe(
    Context.add(D1Counter, makeD1Counter(database)),
    Context.add(LiveRooms, makeLiveRooms(env.LIVE_ROOMS)),
  )
}

const runLiveCounter = <A, E>(effect: Effect.Effect<A, E, D1Counter | LiveRooms>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provideContext(liveCounterContext())))

const readWithTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })

describe("LiveCounter", () => {
  it("reads the current durable count", async () => {
    await expect(runLiveCounter(liveCounterCurrent)).resolves.toBe(0)
  })

  it("increments the count and wakes existing subscribers", async () => {
    const pulses = await runLiveCounter(liveCounterSubscribe)
    const reader = pulses.getReader()

    try {
      const result = await runLiveCounter(liveCounterIncrement)

      expect(result).toMatchObject({ count: 1, publish: { ok: true } })

      const pulse = await readWithTimeout(
        reader.read(),
        1_000,
        "timed out waiting for live-counter pulse",
      )
      expect(pulse.done).toBe(false)
      expect(pulse.value).toEqual(new Uint8Array([1]))
      await expect(runLiveCounter(liveCounterCurrent)).resolves.toBe(1)
    } finally {
      await reader.cancel()
    }
  })
})
