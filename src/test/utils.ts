import { env } from "cloudflare:workers"
import type { AppContext } from "@/app"

export const loadApp = async (): Promise<{
  readonly fetch: (request: Request) => Promise<Response>
}> => {
  const app = await import("@/app")
  return { fetch: (request) => app.handleWithEnv(request, env) }
}

export const loadAppWithContext = async (
  makeContext: () => AppContext,
): Promise<{
  readonly fetch: (request: Request) => Promise<Response>
}> => {
  const app = await import("@/app")
  return { fetch: (request) => app.handle(request, makeContext()) }
}

export const loadAppWithServiceOverrides = async (
  overrideContext: (context: AppContext) => AppContext,
): Promise<{
  readonly fetch: (request: Request) => Promise<Response>
}> => {
  const app = await import("@/app")
  return { fetch: (request) => app.handle(request, overrideContext(app.makeRequestContext(env))) }
}

export const request = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://test.local${path}`, init)

export const datastarPost = (path: string, signals: unknown = {}): Request =>
  request(path, {
    method: "POST",
    headers: { "datastar-request": "true" },
    body: JSON.stringify(signals),
  })

export const resetKvCounter = (): Promise<void> => env.COUNTER_KV.delete("count")

export const corruptKvCounter = (): Promise<void> => env.COUNTER_KV.put("count", "not-a-number")

export const resetD1Counters = async (): Promise<void> => {
  await env.APP_DB.prepare("DELETE FROM d1_counters").run()
}

export const clearR2Objects = async (): Promise<void> => {
  const listed = await env.APP_BUCKET.list()
  await Promise.all(listed.objects.map((object) => env.APP_BUCKET.delete(object.key)))
}

export const countR2Objects = async (): Promise<number> => {
  const listed = await env.APP_BUCKET.list()
  return listed.objects.length
}

export const openSse = (response: Response): ReadableStreamDefaultReader<Uint8Array> => {
  const body = response.body
  if (body === null) throw new Error("expected an SSE stream body")
  return body.getReader()
}

const readWithTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })

export const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  text: string | readonly string[],
  timeoutMs = 2_000,
): Promise<string> => {
  const targets = typeof text === "string" ? [text] : text
  const label = targets.join(", ")
  const decoder = new TextDecoder()
  const startedAt = Date.now()
  let received = ""

  while (!targets.every((target) => received.includes(target))) {
    const remainingMs = timeoutMs - (Date.now() - startedAt)
    const message = `timed out waiting for SSE text: ${label}\nreceived:\n${received}`
    if (remainingMs <= 0) throw new Error(message)

    const chunk = await readWithTimeout(reader.read(), remainingMs, message)
    if (chunk.done)
      throw new Error(`SSE stream ended before text: ${label}\nreceived:\n${received}`)
    received += decoder.decode(chunk.value)
  }

  return received
}
