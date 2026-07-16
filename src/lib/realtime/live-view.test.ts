import { Effect } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import { describe, expect, it } from "vitest"
import { liveRegion, liveView } from "@/lib/realtime/live-view"
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

    expect(calls).toEqual(["subscribe"])

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

  it("renders current state as a Datastar patch", async () => {
    const hub = makePulseHub()

    const response = await Effect.runPromise(
      liveRegion({
        subscribe: Effect.sync(() => hub.subscribe()),
        read: Effect.succeed(3),
        render: (count) => `<output id="count">${count}</output>`,
        log: { feature: "test" },
      }),
    )

    const reader = openSse(HttpServerResponse.toWeb(response))
    try {
      const body = await readUntil(reader, [
        "event: datastar-patch-elements",
        '&lt;output id="count"&gt;3&lt;/output&gt;',
      ])
      expect(body).toContain("event: datastar-patch-elements")
      expect(body).toContain('&lt;output id="count"&gt;3&lt;/output&gt;')
    } finally {
      await reader.cancel()
    }
  })
})
