import { Effect } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import { describe, expect, it } from "vitest"
import { liveView } from "@/lib/realtime/live-view"
import { makePulseHub } from "@/lib/realtime/pulse"
import { openSse, readUntil } from "@/test/utils"

describe("liveView", () => {
  it("subscribes before the initial render", async () => {
    const hub = makePulseHub()
    const calls: string[] = []

    const response = await Effect.runPromise(
      liveView({
        subscribe: Effect.sync(() => {
          calls.push("subscribe")
          return hub.subscribe()
        }),
        render: Effect.sync(() => {
          calls.push("render")
          return "event: test\ndata: initial\n\n"
        }),
        log: { feature: "test" },
      }),
    )

    expect(calls).toEqual(["subscribe", "render"])

    const reader = openSse(HttpServerResponse.toWeb(response))
    try {
      await readUntil(reader, "initial")
    } finally {
      await reader.cancel()
    }

    expect(calls).toEqual(["subscribe", "render"])
  })

  it("does not render when subscription fails", async () => {
    const error = new Error("subscription failed")
    const calls: string[] = []

    const failure = await Effect.runPromise(
      liveView({
        subscribe: Effect.sync(() => {
          calls.push("subscribe")
          return Effect.fail(error)
        }).pipe(Effect.flatten),
        render: Effect.sync(() => {
          calls.push("render")
          return "event: test\ndata: unreachable\n\n"
        }),
        log: { feature: "test" },
      }).pipe(Effect.flip),
    )

    expect(failure).toBe(error)
    expect(calls).toEqual(["subscribe"])
  })
})
