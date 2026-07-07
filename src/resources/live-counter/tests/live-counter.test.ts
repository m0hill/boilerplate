import { env } from "cloudflare:workers"
import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { LiveCounter, makeLiveCounterContext } from "@/resources/live-counter/live-counter"
import { resetD1Counters } from "@/test/utils"

beforeEach(resetD1Counters)

const runLiveCounter = <A, E>(effect: Effect.Effect<A, E, LiveCounter>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provideContext(makeLiveCounterContext(env))))

const current = Effect.flatMap(LiveCounter, (liveCounter) => liveCounter.current)
const subscribe = Effect.flatMap(LiveCounter, (liveCounter) => liveCounter.subscribe)
const increment = Effect.flatMap(LiveCounter, (liveCounter) => liveCounter.increment)

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
    await expect(runLiveCounter(current)).resolves.toBe(0)
  })

  it("increments the count and wakes existing subscribers", async () => {
    const pulses = await runLiveCounter(subscribe)
    const reader = pulses.getReader()

    try {
      const result = await runLiveCounter(increment)

      expect(result).toMatchObject({ count: 1, publish: { ok: true } })

      const pulse = await readWithTimeout(
        reader.read(),
        1_000,
        "timed out waiting for live-counter pulse",
      )
      expect(pulse.done).toBe(false)
      expect(pulse.value).toEqual(new Uint8Array([1]))
      await expect(runLiveCounter(current)).resolves.toBe(1)
    } finally {
      await reader.cancel()
    }
  })
})
