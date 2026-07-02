import { Context, Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { LiveCounter, LiveCounterError } from "@/resources/live-counter/live-counter"
import {
  datastarPost,
  loadApp,
  loadAppWithServiceOverrides,
  openSse,
  readUntil,
  request,
  resetD1Counters,
} from "@/test/utils"

beforeEach(resetD1Counters)

describe("Live counter demo page", () => {
  it("renders the live counter starting at zero", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/live-counter"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">Live counter</h1>")
    expect(html).toContain('id="live-count"')
    expect(html).toContain(">0</output>")
  })

  it("increments the D1 counter and lets the live stream render the value", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/live-counter/increment"))

    expect(response.status).toBe(204)
    await expect(response.text()).resolves.toBe("")

    const page = await app.fetch(request("/live-counter"))
    expect(await page.text()).toContain(">1</output>")
  })

  it("shares the D1 counter row with the D1 demo", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/d1/increment"))
    await app.fetch(datastarPost("/live-counter/increment"))

    const response = await app.fetch(request("/live-counter"))
    const html = await response.text()

    expect(html).toContain(">2</output>")
  })

  it("fans the new value out to subscribers in real time", async () => {
    const app = await loadApp()
    const live = await app.fetch(request("/live-counter/stream"))

    expect(live.status).toBe(200)
    expect(live.headers.get("content-type")).toBe("text/event-stream")

    const reader = openSse(live)

    const snapshot = await readUntil(reader, ">0</output>")
    expect(snapshot).toContain("event: datastar-patch-elements")
    expect(snapshot).toContain(">0</output>")

    await app.fetch(datastarPost("/live-counter/increment"))

    const received = await readUntil(reader, ">1</output>")
    expect(received).toContain("event: datastar-patch-elements")
    expect(received).toContain('id="live-count"')
    expect(received).toContain(">1</output>")

    await reader.cancel()
  })

  it("renders service failures as unavailable", async () => {
    const app = await loadAppWithServiceOverrides((context) =>
      context.pipe(
        Context.add(
          LiveCounter,
          LiveCounter.of({
            current: Effect.fail(new LiveCounterError({ reason: "read_failed" })),
            subscribe: Effect.succeed(new ReadableStream<Uint8Array>()),
            increment: Effect.succeed({ count: 0, publish: { ok: true } }),
          }),
        ),
      ),
    )

    const response = await app.fetch(request("/live-counter"))
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(body).toBe("Live counter demo unavailable")
  })
})
