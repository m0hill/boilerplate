import { Context, Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { D1Counter, D1CounterError } from "@/resources/d1/counter"
import {
  datastarPost,
  loadApp,
  loadAppWithServiceOverrides,
  request,
  resetD1Counters,
} from "@/test/utils"

beforeEach(resetD1Counters)

describe("D1 demo page", () => {
  it("renders the D1 counter starting at zero", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/d1"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">D1 + Drizzle counter</h1>")
    expect(html).toContain(
      '<output id="d1-count" class="text-5xl font-bold tabular-nums">0</output>',
    )
    expect(html).toContain("Increment")
  })

  it("increments the D1 counter and patches the value", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/d1/increment"))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain(
      '<output id="d1-count" class="text-5xl font-bold tabular-nums">1</output>',
    )
  })

  it("persists the D1 count across requests", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/d1/increment"))
    await app.fetch(datastarPost("/d1/increment"))

    const response = await app.fetch(request("/d1"))
    const html = await response.text()

    expect(html).toContain(
      '<output id="d1-count" class="text-5xl font-bold tabular-nums">2</output>',
    )
  })

  it("renders service failures as unavailable", async () => {
    const app = await loadAppWithServiceOverrides((context) =>
      context.pipe(
        Context.add(
          D1Counter,
          D1Counter.of({
            current: Effect.fail(new D1CounterError({ reason: "read_failed" })),
            increment: Effect.succeed(0),
          }),
        ),
      ),
    )

    const response = await app.fetch(request("/d1"))
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(body).toBe("D1 demo unavailable")
  })
})
