import { describe, expect, it } from "vitest"
import { loadApp, request } from "../../test-utils.js"

describe("web component demo page", () => {
  it("renders the custom element wired to a Datastar signal", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/web-component"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">Web component</h1>")
    expect(html).toContain("<qr-code")
    expect(html).toContain('data-bind="text"')
    expect(html).toContain("data-attr:text")
    expect(html).toContain('<script type="module" src="/js/qr.js"></script>')
  })
})
