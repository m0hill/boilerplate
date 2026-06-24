import { env } from "cloudflare:workers"
import { vi } from "vitest"

export type TestWebHandler = { fetch: (request: Request) => Promise<Response> }

export const loadApp = async (): Promise<TestWebHandler> => {
  vi.resetModules()
  const app = (await import("./server.js")).default
  return { fetch: (request) => app.fetch(request, env) }
}

export const request = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://test.local${path}`, init)

export const datastarPost = (path: string, signals: unknown = {}): Request =>
  request(path, {
    method: "POST",
    headers: { "datastar-request": "true" },
    body: JSON.stringify(signals),
  })
