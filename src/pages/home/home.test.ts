import { describe, expect, it, vi } from "vitest"
import type { Hono } from "hono"
import { datastarPost, request } from "../../test-utils.js"

const loadApp = async (): Promise<Hono> => {
  vi.resetModules()
  return (await import("../../server.js")).app
}

describe("home page", () => {
  it("renders the initial page as HTML", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain("<!doctype html>")
    expect(html).toContain(">Boilerplate</h1>")
    expect(html).toContain('<link rel="stylesheet" href="/app.css">')
    expect(html).toContain('data-bind="step"')
    expect(html).toContain('<output id="count">0</output>')
  })

  it("increments by the validated step and patches the count", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/increment", { step: "5" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('<output id="count">5</output>')
  })

  it("rejects an invalid step with a validation message and no count change", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/increment", { step: "-2" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("Step must be a positive whole number.")
    expect(body).not.toContain("datastar-patch-elements")
  })

  it("returns 404 for unknown routes", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/nope"))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe("Not Found")
  })
})
