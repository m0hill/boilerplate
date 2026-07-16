import { Effect, Layer, Stream } from "effect"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, onTestFinished } from "vitest"
import { RealtimeCounter } from "@/services/realtime-counter/realtime-counter"
import { SqliteCounterError } from "@/services/sqlite/counter"
import { datastarPost, loadApp, openSse, readUntil, request } from "@/test/utils"

describe("Realtime page", () => {
  it("streams initial state and converges open subscribers after a command", async () => {
    const app = await loadApp()
    const firstResponse = await app.fetch(request("/realtime/stream"))
    const secondResponse = await app.fetch(request("/realtime/stream"))
    const first = openSse(firstResponse)
    const second = openSse(secondResponse)

    expect(firstResponse.headers.get("content-type")).toBe("text/event-stream")
    await readUntil(first, ['id="realtime-count"', ">0</output>"])
    await readUntil(second, ['id="realtime-count"', ">0</output>"])

    const increment = await app.fetch(datastarPost("/realtime/increment"))
    expect(increment.status).toBe(204)
    await expect(increment.text()).resolves.toBe("")
    await readUntil(first, ">1</output>")
    await readUntil(second, ">1</output>")

    await first.cancel()
    await second.cancel()
  })

  it("maps persistence failures without publishing a command patch", async () => {
    const failure = new SqliteCounterError({ reason: "write_failed" })
    const app = await loadApp({
      realtimeCounterLayer: Layer.succeed(RealtimeCounter)(
        RealtimeCounter.of({ changes: Stream.make(0), increment: Effect.fail(failure) }),
      ),
    })

    const response = await app.fetch(datastarPost("/realtime/increment"))

    expect(response.status).toBe(503)
    expect(response.headers.get("content-type")).not.toBe("text/event-stream")
    await expect(response.text()).resolves.toBe("Realtime counter unavailable")
  })

  it("releases stream-scoped resources when the browser cancels", async () => {
    let finalized = () => {}
    const wasFinalized = new Promise<void>((resolve) => {
      finalized = resolve
    })
    const changes = Stream.unwrap(
      Effect.acquireRelease(Effect.void, () => Effect.sync(finalized)).pipe(
        Effect.map(() => Stream.make(0).pipe(Stream.concat(Stream.never))),
      ),
    )
    const app = await loadApp({
      realtimeCounterLayer: Layer.succeed(RealtimeCounter)(
        RealtimeCounter.of({ changes, increment: Effect.void }),
      ),
    })
    const response = await app.fetch(request("/realtime/stream"))
    const reader = openSse(response)
    await readUntil(reader, ">0</output>")

    reader.releaseLock()
    await response.body?.cancel()

    await expect(wasFinalized).resolves.toBeUndefined()
  })

  it("reconnects to current truth and recovers it after an application restart", async () => {
    const directory = mkdtempSync(join(tmpdir(), "boilerplate-realtime-restart-"))
    const databasePath = join(directory, "app.db")
    onTestFinished(() => rmSync(directory, { recursive: true, force: true }))

    const firstApp = await loadApp({ databasePath })
    const firstStream = openSse(await firstApp.fetch(request("/realtime/stream")))
    await readUntil(firstStream, ">0</output>")
    await firstStream.cancel()
    expect((await firstApp.fetch(datastarPost("/realtime/increment"))).status).toBe(204)
    await firstApp.dispose()

    const restartedApp = await loadApp({ databasePath })
    const recoveredStream = openSse(await restartedApp.fetch(request("/realtime/stream")))
    await readUntil(recoveredStream, ">1</output>")
    await recoveredStream.cancel()
  })
})
