import { env } from "cloudflare:workers"
import { beforeEach, describe, expect, it } from "vitest"
import { datastarPost, loadApp, request } from "../../../test/utils.js"

beforeEach(async () => {
  await env.APP_DB.prepare("DELETE FROM d1_counters").run()
})

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

    const body = live.body
    if (body === null) throw new Error("expected an SSE stream body")

    const reader = body.getReader()
    const decoder = new TextDecoder()

    const snapshot = decoder.decode((await reader.read()).value)
    expect(snapshot).toContain("event: datastar-patch-elements")
    expect(snapshot).toContain(">0</output>")

    await app.fetch(datastarPost("/live-counter/increment"))

    let received = ""
    while (!received.includes(">1</output>")) {
      const { value, done } = await reader.read()
      if (done) break
      received += decoder.decode(value)
    }

    expect(received).toContain("event: datastar-patch-elements")
    expect(received).toContain('id="live-count"')
    expect(received).toContain(">1</output>")

    await reader.cancel()
  })
})
