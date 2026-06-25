import { describe, expect, it } from "vitest"
import { loadApp, request } from "../../test-utils.js"

describe("client island demo page", () => {
  it("renders the island shell and loads the bundled script", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/island"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">Client island</h1>")
    expect(html).toContain('id="qr-input"')
    expect(html).toContain('id="qr-canvas"')
    expect(html).toContain('<script type="module" src="/js/qr.js"></script>')
  })
})
