import { beforeEach, describe, expect, it } from "vitest"
import { env } from "cloudflare:test"
import { datastarPost, loadApp, request } from "../../test-utils.js"

beforeEach(() => env.COUNTER_KV.delete("count"))

describe("counter page", () => {
  it("renders the counter starting at zero", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/counter"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">KV counter</h1>")
    expect(html).toContain('<output id="count" class="text-5xl font-bold tabular-nums">0</output>')
    expect(html).toContain("Increment")
  })

  it("increments the counter and patches the value", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/counter/increment"))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('<output id="count" class="text-5xl font-bold tabular-nums">1</output>')
  })

  it("persists the count across requests", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/counter/increment"))
    await app.fetch(datastarPost("/counter/increment"))

    const response = await app.fetch(request("/counter"))
    const html = await response.text()

    expect(html).toContain('<output id="count" class="text-5xl font-bold tabular-nums">2</output>')
  })
})
