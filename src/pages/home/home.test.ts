import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { http, HttpResponse } from "msw"
import { setupNetwork } from "@msw/cloudflare"
import type { Hono } from "hono"
import type { AppEnv } from "../../app-env.js"
import { datastarPost, request } from "../../test-utils.js"

const network = setupNetwork()

beforeAll(() => network.enable())
afterEach(() => network.resetHandlers())
afterAll(() => network.disable())

const loadApp = async (): Promise<Hono<AppEnv>> => {
  vi.resetModules()
  return (await import("../../server.js")).default
}

const mockRepo = (body: Record<string, unknown>, init?: ResponseInit) =>
  network.use(
    http.get("https://api.github.com/repos/:owner/:repo", () => HttpResponse.json(body, init)),
  )

describe("home page", () => {
  it("renders the lookup form as HTML", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain("<!doctype html>")
    expect(html).toContain(">Boilerplate</h1>")
    expect(html).toContain('<link rel="stylesheet" href="/app.css">')
    expect(html).toContain('data-bind="repo"')
    expect(html).toContain('<output id="stars" class="text-xl">—</output>')
  })

  it("looks up a repo and patches the star count", async () => {
    mockRepo({ full_name: "mswjs/cloudflare", stargazers_count: 1234 })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/lookup", { repo: "mswjs/cloudflare" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain("mswjs/cloudflare · 1,234 ★")
  })

  it("rejects a malformed repo without touching the network", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/lookup", { repo: "not-a-repo" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Use the owner/repo format")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('<output id="stars" class="text-xl">—</output>')
  })

  it("shows a friendly error when the repo does not exist", async () => {
    mockRepo({ message: "Not Found" }, { status: 404 })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/lookup", { repo: "mswjs/nope" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("Repository mswjs/nope not found")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('<output id="stars" class="text-xl">—</output>')
  })

  it("shows a friendly error when GitHub returns an unexpected response", async () => {
    mockRepo({ full_name: "mswjs/cloudflare", stargazers_count: "many" })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/lookup", { repo: "mswjs/cloudflare" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("Could not reach GitHub. Try again.")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('<output id="stars" class="text-xl">—</output>')
  })

  it("returns 404 for unknown routes", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/nope"))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe("Not Found")
  })
})
