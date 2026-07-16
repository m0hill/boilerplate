import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { SqliteCounter, SqliteCounterError } from "@/services/sqlite/counter"
import { datastarPost, loadApp, request } from "@/test/utils"

describe("SQLite page", () => {
  it("renders, increments, and persists the counter", async () => {
    const app = await loadApp()
    const initialResponse = await app.fetch(request("/sqlite"))
    const initialHtml = await initialResponse.text()

    expect(initialResponse.status).toBe(200)
    expect(initialHtml).toContain(">SQLite + Drizzle counter</h1>")
    expect(initialHtml).toContain(
      '<output id="sqlite-count" class="text-5xl font-bold tabular-nums">0</output>',
    )

    const incrementResponse = await app.fetch(datastarPost("/sqlite/increment"))
    const incrementBody = await incrementResponse.text()
    expect(incrementResponse.headers.get("content-type")).toBe("text/event-stream")
    expect(incrementBody).toContain("event: datastar-patch-elements")
    expect(incrementBody).toContain(
      '<output id="sqlite-count" class="text-5xl font-bold tabular-nums">1</output>',
    )

    const persistedResponse = await app.fetch(request("/sqlite"))
    expect(await persistedResponse.text()).toContain(
      '<output id="sqlite-count" class="text-5xl font-bold tabular-nums">1</output>',
    )
  })

  it("maps typed persistence failures to an unavailable response", async () => {
    const app = await loadApp({
      sqliteCounterLayer: Layer.succeed(SqliteCounter)(
        SqliteCounter.of({
          current: Effect.fail(new SqliteCounterError({ reason: "read_failed" })),
          increment: Effect.succeed(0),
        }),
      ),
    })

    const response = await app.fetch(request("/sqlite"))

    expect(response.status).toBe(503)
    expect(await response.text()).toBe("SQLite counter unavailable")
  })

  it("builds the counter Layer once for the application scope", async () => {
    let acquisitions = 0
    const app = await loadApp({
      sqliteCounterLayer: Layer.sync(SqliteCounter)(() => {
        acquisitions += 1
        return SqliteCounter.of({ current: Effect.succeed(0), increment: Effect.succeed(1) })
      }),
    })

    await app.fetch(request("/sqlite"))
    await app.fetch(request("/sqlite"))
    await app.fetch(datastarPost("/sqlite/increment"))

    expect(acquisitions).toBe(1)
  })
})
