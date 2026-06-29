import { env } from "cloudflare:workers"
import { vi } from "vitest"

export const loadApp = async (): Promise<{
  readonly fetch: (request: Request) => Promise<Response>
}> => {
  vi.resetModules()
  const app = (await import("@/index")).default
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
