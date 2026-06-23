import { env } from "cloudflare:test"
import { vi } from "vitest"

/** Minimal fetch-only surface used by Workers-pool integration tests. */
export type TestWebHandler = { fetch: (request: Request) => Promise<Response> }

/** Loads a fresh Worker app instance wired to the Workers test-pool env. */
export const loadApp = async (): Promise<TestWebHandler> => {
  vi.resetModules()
  const app = (await import("./server.js")).default
  return { fetch: (request) => app.fetch(request, env) }
}

/** Creates an absolute test request for the local app seam. */
export const request = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://test.local${path}`, init)

/** Creates a Datastar POST request carrying serialized signal payloads. */
export const datastarPost = (path: string, signals: unknown = {}): Request =>
  request(path, {
    method: "POST",
    headers: { "datastar-request": "true" },
    body: JSON.stringify(signals),
  })
