import { Effect, Layer } from "effect"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vitest"
import { ServerConfig } from "@/server/config"
import { type SqliteCounter } from "@/services/sqlite/counter"
import { type RealtimeCounter } from "@/services/realtime-counter/realtime-counter"
import { migrateSqlite, sqliteMigrationDatabaseLayer } from "@/services/sqlite/database"

type AppOptions = {
  readonly fetch?: typeof globalThis.fetch
  readonly publicDirectory?: string
  readonly databasePath?: string
  readonly sqliteCounterLayer?: Layer.Layer<SqliteCounter>
  readonly realtimeCounterLayer?: Layer.Layer<RealtimeCounter, never, SqliteCounter>
}

export const loadApp = async (
  options: AppOptions = {},
): Promise<{
  readonly fetch: (request: Request) => Promise<Response>
  readonly dispose: () => Promise<void>
}> => {
  const databaseDirectory = mkdtempSync(join(tmpdir(), "boilerplate-test-"))
  const databasePath = options.databasePath ?? join(databaseDirectory, "app.db")
  const configLayer = Layer.succeed(ServerConfig)(
    ServerConfig.of({ host: "127.0.0.1", port: 3000, databasePath }),
  )

  await Effect.runPromise(
    migrateSqlite.pipe(Effect.provide(sqliteMigrationDatabaseLayer), Effect.provide(configLayer)),
  )

  const app = await import("@/app")
  const { handler, dispose } = app.makeAppHandler({ ...options, databasePath })
  let disposed = false
  const disposeOnce = async () => {
    if (disposed) return
    disposed = true
    await dispose()
  }
  onTestFinished(async () => {
    await disposeOnce()
    rmSync(databaseDirectory, { recursive: true, force: true })
  })

  return { fetch: (request) => handler(request), dispose: disposeOnce }
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
