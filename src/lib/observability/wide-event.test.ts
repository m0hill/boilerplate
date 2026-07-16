import { Option, Schema } from "effect"
import { describe, expect, it, vi } from "vitest"
import { datastarPost, loadApp, request } from "@/test/utils"

const WideEventSchema = Schema.Struct({
  message: Schema.Literals(["http_request"]),
  level: Schema.String,
  annotations: Schema.Record(Schema.String, Schema.Unknown),
})

type WideEvent = Schema.Schema.Type<typeof WideEventSchema>

const HttpAnnotationSchema = Schema.Struct({
  durationMs: Schema.Number,
})

const decodeWideEvent = (entry: unknown): Option.Option<WideEvent> =>
  Schema.decodeUnknownOption(WideEventSchema)(entry).pipe(
    Option.orElse(() =>
      typeof entry === "string"
        ? Schema.decodeUnknownOption(Schema.fromJsonString(WideEventSchema))(entry)
        : Option.none(),
    ),
  )

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
    const event = decodeWideEvent(entry)
    if (Option.isSome(event)) events.push(event.value)
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
    const { events, entries } = await captureWideEvents(() => app.fetch(request("/api")))

    expect(events).toHaveLength(1)
    expect(entries).toHaveLength(1)
    expect(Option.isSome(decodeWideEvent(entries[0]))).toBe(true)
    const [event] = events
    expect(event?.level).toBe("INFO")
    expect(event?.annotations).toMatchObject({
      http: { method: "GET", path: "/api", status: 200 },
      page: { name: "api" },
    })
    const http = Option.getOrThrowWith(
      Schema.decodeUnknownOption(HttpAnnotationSchema)(event?.annotations.http),
      () => new Error("expected http duration annotation"),
    )
    expect(typeof http.durationMs).toBe("number")
  })

  it("records the action that mutated the request", async () => {
    const app = await loadApp()
    const { events } = await captureWideEvents(() =>
      app.fetch(datastarPost("/api/lookup", { repo: "not-a-repo" })),
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.annotations).toMatchObject({
      http: { method: "POST", path: "/api/lookup", status: 200 },
      lookup: { ok: false, action: "lookup", reason: "invalid_repo" },
    })
  })

  it("keeps action annotations isolated to their request", async () => {
    const app = await loadApp()
    const { events } = await captureWideEvents(async () => {
      await app.fetch(datastarPost("/api/lookup", { repo: "not-a-repo" }))
      await app.fetch(request("/api"))
    })

    expect(events).toHaveLength(2)
    expect(events[0]?.annotations).toHaveProperty("lookup")
    expect(events[1]?.annotations).not.toHaveProperty("lookup")
    expect(events[1]?.annotations).toMatchObject({
      http: { method: "GET", path: "/api", status: 200 },
      page: { name: "api" },
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
