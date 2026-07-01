import { env } from "cloudflare:workers"

export const loadApp = async (): Promise<{
  readonly fetch: (request: Request) => Promise<Response>
}> => {
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
