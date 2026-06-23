import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { http, HttpResponse } from "msw"
import { setupNetwork } from "@msw/cloudflare"
import { env } from "cloudflare:test"
import { datastarPost, request } from "../../test-utils.js"

const network = setupNetwork()

beforeAll(() => network.enable())
afterEach(() => network.resetHandlers())
afterAll(() => network.disable())

type WebHandler = { fetch: (request: Request) => Promise<Response> }

const loadApp = async (): Promise<WebHandler> => {
  vi.resetModules()
  const app = (await import("../../server.js")).default
  return { fetch: (request) => app.fetch(request, env) }
}

type GitHubRepoBody = Record<string, unknown>

const mockRepo = (body: GitHubRepoBody, init?: ResponseInit) =>
  network.use(
    http.get("https://api.github.com/repos/:owner/:repo", () => HttpResponse.json(body, init)),
  )

const mockRepos = (repos: Readonly<Record<string, GitHubRepoBody>>) =>
  network.use(
    http.get("https://api.github.com/repos/:owner/:repo", ({ params }) => {
      const key = `${String(params.owner)}/${String(params.repo)}`
      const repo = repos[key]

      if (repo === undefined) {
        return HttpResponse.json({ message: "Not Found" }, { status: 404 })
      }

      return HttpResponse.json(repo)
    }),
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
    expect(html).not.toContain("/js/clock.js")
    expect(html).toContain('data-bind="repo"')
    expect(html).toContain("Look up repo")
    expect(html).toContain('aria-label="Compare board"')
    expect(html).toContain("No repositories on the compare board yet.")
    expect(html).toContain('<output id="stars" class="text-xl">—</output>')
  })

  it("looks up a repo and patches comparable repo stats", async () => {
    mockRepo({
      full_name: "mswjs/cloudflare",
      stargazers_count: 1234,
      forks_count: 56,
      open_issues_count: 7,
      language: "TypeScript",
    })

    const app = await loadApp()
    const response = await app.fetch(datastarPost("/lookup", { repo: "mswjs/cloudflare" }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain("mswjs/cloudflare · 1,234 ★")
    expect(body).toContain("56 forks")
    expect(body).toContain("7 open issues")
    expect(body).toContain("TypeScript")
    expect(body).toContain("Add to compare")
  })

  it("adds a repo to the compare board", async () => {
    mockRepo({
      full_name: "mswjs/cloudflare",
      stargazers_count: 1234,
      forks_count: 56,
      open_issues_count: 7,
      language: "TypeScript",
    })

    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/compare/add", { repo: "mswjs/cloudflare", compareRepos: [] }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain('"compareRepos":["mswjs/cloudflare"]')
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('aria-label="Compare board"')
    expect(body).toContain("mswjs/cloudflare")
    expect(body).toContain("1,234")
    expect(body).toContain("56")
    expect(body).toContain("7")
    expect(body).toContain("TypeScript")
    expect(body).toContain("Remove")
  })

  it("adds another repo while keeping the current compare board", async () => {
    mockRepos({
      "mswjs/cloudflare": {
        full_name: "mswjs/cloudflare",
        stargazers_count: 1234,
        forks_count: 56,
        open_issues_count: 7,
        language: "TypeScript",
      },
      "honojs/hono": {
        full_name: "honojs/hono",
        stargazers_count: 26000,
        forks_count: 800,
        open_issues_count: 42,
        language: "TypeScript",
      },
    })

    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/compare/add", { repo: "honojs/hono", compareRepos: ["mswjs/cloudflare"] }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('"compareRepos":["mswjs/cloudflare","honojs/hono"]')
    expect(body).toContain("mswjs/cloudflare")
    expect(body).toContain("honojs/hono")
    expect(body).toContain("1,234")
    expect(body).toContain("26,000")
  })

  it("limits the compare board to a few repos", async () => {
    mockRepos({})

    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/compare/add", {
        repo: "five/e",
        compareRepos: ["one/a", "two/b", "three/c", "four/d"],
      }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("Compare up to 4 repositories.")
  })

  it("removes a repo from the compare board", async () => {
    mockRepos({
      "honojs/hono": {
        full_name: "honojs/hono",
        stargazers_count: 26000,
        forks_count: 800,
        open_issues_count: 42,
        language: "TypeScript",
      },
    })

    const app = await loadApp()
    const response = await app.fetch(
      datastarPost("/compare/remove", {
        repo: "mswjs/cloudflare",
        compareRepos: ["mswjs/cloudflare", "honojs/hono"],
      }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain('"compareRepos":["honojs/hono"]')
    expect(body).toContain("honojs/hono")
    expect(body).toContain("26,000")
    expect(body).not.toContain("mswjs/cloudflare")
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

  it("rejects malformed Datastar lookup signals with a form error", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      request("/lookup", {
        method: "POST",
        headers: { "datastar-request": "true" },
        body: "not json",
      }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Use the owner/repo format")
    expect(body).toContain("event: datastar-patch-elements")
    expect(body).toContain('<output id="stars" class="text-xl">—</output>')
  })

  it("rejects malformed Datastar compare signals with a board error", async () => {
    const app = await loadApp()
    const response = await app.fetch(
      request("/compare/add", {
        method: "POST",
        headers: { "datastar-request": "true" },
        body: "not json",
      }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(body).toContain("event: datastar-patch-signals")
    expect(body).toContain("Choose a valid repository to compare.")
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
