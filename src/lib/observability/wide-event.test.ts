import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { datastarPost, loadApp, request } from "@/test/utils"

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

const captureWideEvents = async (
  fn: () => Promise<unknown>,
): Promise<{
  readonly events: ReadonlyArray<WideEvent>
  readonly entries: ReadonlyArray<unknown>
}> => {
  const events: WideEvent[] = []
  const entries: unknown[] = []
  const spy = vi.spyOn(console, "log").mockImplementation((entry: unknown) => {
    entries.push(entry)
    if (isWideEvent(entry)) {
      events.push(entry)
      return
    }
    if (typeof entry !== "string") return
    try {
      const parsed: unknown = JSON.parse(entry)
      if (isWideEvent(parsed)) events.push(parsed)
    } catch {}
  })

  try {
    await fn()
  } finally {
    spy.mockRestore()
  }

  return { events, entries }
}

describe("wide-event request logger", () => {
  it("emits exactly one structured console object per request, enriched with handler context", async () => {
    const app = await loadApp()
    const { events, entries } = await captureWideEvents(() => app.fetch(request("/d1")))

    expect(events).toHaveLength(1)
    expect(entries).toHaveLength(1)
    expect(isWideEvent(entries[0])).toBe(true)
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
    const { events } = await captureWideEvents(() => app.fetch(datastarPost("/d1/increment")))

    expect(events).toHaveLength(1)
    expect(events[0]?.annotations).toMatchObject({
      http: { method: "POST", path: "/d1/increment", status: 200 },
      d1Counter: { ok: true, action: "increment" },
    })
  })

  it("logs unmatched routes as a single warn-level event", async () => {
    const app = await loadApp()
    const { events } = await captureWideEvents(() => app.fetch(request("/nope")))

    expect(events).toHaveLength(1)
    expect(events[0]?.level).toBe("WARN")
    expect(events[0]?.annotations).toMatchObject({ http: { status: 404 } })
  })
})
