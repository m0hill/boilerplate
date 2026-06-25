import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it } from "vitest"
import { datastarPost, loadApp, request } from "../../test-utils.js"

beforeEach(() => env.COUNTER_KV.delete("count"))

describe("KV demo page", () => {
  it("renders the KV counter starting at zero", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/kv"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">KV counter</h1>")
    expect(html).toContain(
      '<output id="kv-count" class="text-5xl font-bold tabular-nums">0</output>',
    )
    expect(html).toContain("Increment")
  })

  it("increments the KV counter and patches the value", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/kv/increment"))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain(
      '<output id="kv-count" class="text-5xl font-bold tabular-nums">1</output>',
    )
  })

  it("persists the count across requests", async () => {
    const app = await loadApp()
    await app.fetch(datastarPost("/kv/increment"))
    await app.fetch(datastarPost("/kv/increment"))

    const response = await app.fetch(request("/kv"))
    const html = await response.text()

    expect(html).toContain(
      '<output id="kv-count" class="text-5xl font-bold tabular-nums">2</output>',
    )
  })
})
