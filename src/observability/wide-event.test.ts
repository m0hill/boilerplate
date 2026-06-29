import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { datastarPost, loadApp, request } from "../test-utils.js"

beforeEach(async () => {
  await env.APP_DB.prepare("DELETE FROM d1_counters").run()
})

type WideEvent = {
  message: string
  level: string
  annotations: Record<string, unknown>
}

const isWideEvent = (value: unknown): value is WideEvent =>
  typeof value === "object" &&
  value !== null &&
  (value as { message?: unknown }).message === "http_request"

const captureWideEvents = async (fn: () => Promise<unknown>): Promise<WideEvent[]> => {
  const events: WideEvent[] = []
  const spy = vi.spyOn(console, "log").mockImplementation((line: unknown) => {
    if (typeof line !== "string") return
    try {
      const parsed: unknown = JSON.parse(line)
      if (isWideEvent(parsed)) events.push(parsed)
    } catch {}
  })

  try {
    await fn()
  } finally {
    spy.mockRestore()
  }

  return events
}

describe("wide-event request logger", () => {
  it("emits exactly one structured line per request, enriched with handler context", async () => {
    const app = await loadApp()
    const events = await captureWideEvents(() => app.fetch(request("/d1")))

    expect(events).toHaveLength(1)
    const [event] = events
    expect(event?.level).toBe("INFO")
    expect(event?.annotations).toMatchObject({
      http: { method: "GET", path: "/d1", status: 200 },
      d1Counter: { ok: true, action: "view" },
    })
    const http = event?.annotations.http as { durationMs: unknown }
    expect(typeof http.durationMs).toBe("number")
  })

  it("records the action that mutated the request", async () => {
    const app = await loadApp()
    const events = await captureWideEvents(() => app.fetch(datastarPost("/d1/increment")))

    expect(events).toHaveLength(1)
    expect(events[0]?.annotations).toMatchObject({
      http: { method: "POST", path: "/d1/increment", status: 200 },
      d1Counter: { ok: true, action: "increment" },
    })
  })

  it("logs unmatched routes as a single warn-level event", async () => {
    const app = await loadApp()
    const events = await captureWideEvents(() => app.fetch(request("/nope")))

    expect(events).toHaveLength(1)
    expect(events[0]?.level).toBe("WARN")
    expect(events[0]?.annotations).toMatchObject({ http: { status: 404 } })
  })
})
