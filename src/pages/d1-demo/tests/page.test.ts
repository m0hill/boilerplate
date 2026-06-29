import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it } from "vitest"
import { datastarPost, loadApp, request } from "../../../test-utils.js"

beforeEach(async () => {
  await env.APP_DB.prepare("DELETE FROM d1_counters").run()
})

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
})
