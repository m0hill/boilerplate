import { describe, expect, it } from "vitest"
import { loadApp, request } from "@/test/utils"

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
    expect(html).toContain('<script type="speculationrules">')
    expect(html).toContain('"eagerness":"moderate"')
    expect(html).toContain(
      '"selector_matches":"a[data-nav-prefetch]:not([target=\'_blank\']):not([download])"',
    )
  })

  it("links to every demo", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/"))
    const html = await response.text()

    expect(html).toContain('href="/api"')
    expect(html).toContain('href="/web-component"')
    expect(html).toContain('href="/design"')
    expect(html).not.toContain('href="/kv"')
    expect(html).not.toContain('href="/d1"')
    expect(html).not.toContain('href="/r2"')
    expect(html).not.toContain('href="/do"')
    expect(html).not.toContain('href="/live-counter"')
    expect(html).toContain('data-nav-prefetch="true"')
  })

  it("returns 404 for unknown routes", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/nope"))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe("Not Found")
  })
})
