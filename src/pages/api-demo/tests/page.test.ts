import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { setupNetwork } from "@msw/cloudflare"
import { datastarPost, loadApp, request } from "../../../test-utils.js"

const network = setupNetwork()

beforeAll(() => network.enable())
afterEach(() => network.resetHandlers())
afterAll(() => network.disable())

const mockRepo = (body: Record<string, unknown>, init?: ResponseInit) =>
  network.use(
    http.get("https://api.github.com/repos/:owner/:repo", () => HttpResponse.json(body, init)),
  )

describe("external API demo page", () => {
  it("renders the lookup form", async () => {
    const app = await loadApp()
    const response = await app.fetch(request("/api"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain(">External API</h1>")
    expect(html).toContain('data-bind="repo"')
    expect(html).toContain("Look up")
    expect(html).toContain("Look up a repository to see its public stats.")
  })

  it("looks up a repo and patches its stats", async () => {
    mockRepo({
      full_name: "honojs/hono",
      stargazers_count: 26000,
      forks_count: 800,
      open_issues_count: 42,
      language: "TypeScript",
    })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/api/lookup", { repo: "honojs/hono" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain("honojs/hono")
    expect(body).toContain("26,000")
    expect(body).toContain("800")
    expect(body).toContain("42")
    expect(body).toContain("TypeScript")
  })

  it("rejects a malformed repo without touching the network", async () => {
    const app = await loadApp()
    const response = await app.fetch(datastarPost("/api/lookup", { repo: "not-a-repo" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Use the owner/repo format")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain("Look up a repository to see its public stats.")
  })

  it("rejects malformed Datastar signals with a form error", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      request("/api/lookup", {
        method: "POST",
        headers: { "datastar-request": "true" },
        body: "not json",
      }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Use the owner/repo format")
  })

  it("shows a friendly error when the repo does not exist", async () => {
    mockRepo({ message: "Not Found" }, { status: 404 })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/api/lookup", { repo: "honojs/nope" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("Repository honojs/nope not found")
    expect(body).toContain("event: datastar-patch-elements")
  })

  it("shows a friendly error when GitHub returns an unexpected body", async () => {
    mockRepo({ full_name: "honojs/hono", stargazers_count: "many" })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/api/lookup", { repo: "honojs/hono" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain("Could not reach GitHub. Try again.")
    expect(body).toContain("event: datastar-patch-elements")
  })
})
