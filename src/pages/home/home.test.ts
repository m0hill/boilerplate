import { describe, expect, it } from "vitest"
import { loadApp, request } from "../../test-utils.js"

describe("home index", () => {
  it("renders the demo index as HTML", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain("<!doctype html>")
    expect(html).toContain(">Boilerplate</h1>")
    expect(html).toContain('<link rel="stylesheet" href="/app.css">')
  })

  it("links to every demo", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/"))
    const html = await response.text()

    expect(html).toContain('href="/kv"')
    expect(html).toContain('href="/d1"')
    expect(html).toContain('href="/r2"')
    expect(html).toContain('href="/api"')
    expect(html).toContain('href="/island"')
  })

  it("returns 404 for unknown routes", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/nope"))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe("Not Found")
  })
})
