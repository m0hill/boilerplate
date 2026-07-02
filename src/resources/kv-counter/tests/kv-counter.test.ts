import { env } from "cloudflare:workers"
import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { KvCounterError, makeKvCounter } from "@/resources/kv-counter/kv-counter"
import { corruptKvCounter, resetKvCounter } from "@/test/utils"

beforeEach(resetKvCounter)

const runKvCounter = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect)

describe("KvCounter", () => {
  it("treats invalid stored values as typed storage failures", async () => {
    await corruptKvCounter()

    const error = await Effect.runPromise(makeKvCounter(env.COUNTER_KV).current.pipe(Effect.flip))

    expect(error).toBeInstanceOf(KvCounterError)
    expect(error.reason).toBe("invalid_value")
  })

  it("increments from an empty counter", async () => {
    const counter = makeKvCounter(env.COUNTER_KV)

    await expect(runKvCounter(counter.increment)).resolves.toBe(1)
    await expect(runKvCounter(counter.current)).resolves.toBe(1)
  })
})
