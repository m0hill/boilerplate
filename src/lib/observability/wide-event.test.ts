import { Option, Schema } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { datastarPost, loadApp, request, resetD1Counters } from "@/test/utils"

beforeEach(resetD1Counters)

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
    const { events, entries } = await captureWideEvents(() => app.fetch(request("/d1")))

    expect(events).toHaveLength(1)
    expect(entries).toHaveLength(1)
    expect(Option.isSome(decodeWideEvent(entries[0]))).toBe(true)
    const [event] = events
    expect(event?.level).toBe("INFO")
    expect(event?.annotations).toMatchObject({
      http: { method: "GET", path: "/d1", status: 200 },
      d1Counter: { ok: true, action: "view" },
    })
    const http = Option.getOrThrowWith(
      Schema.decodeUnknownOption(HttpAnnotationSchema)(event?.annotations.http),
      () => new Error("expected http duration annotation"),
    )
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
