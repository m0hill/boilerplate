import { EventEmitter } from "node:events"
import { watch } from "node:fs"
import type { Hono } from "hono"
import { streamSSE } from "hono/streaming"

const BOOT_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`

const SSE_PATH = "/__livereload"

export const LIVE_RELOAD_SCRIPT_PATH = "/livereload.js"

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const reloads = new EventEmitter()
let watching = false

const startWatchingAssets = (): void => {
  if (watching) return
  watching = true

  let timer: NodeJS.Timeout | undefined
  const watcher = watch("./public", { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(() => reloads.emit("change"), 100)
    timer.unref()
  })
  watcher.unref()
}

export const registerLiveReload = (app: Hono): void => {
  app.get(SSE_PATH, (c) =>
    streamSSE(c, async (stream) => {
      startWatchingAssets()

      const onChange = (): void => {
        void stream.writeSSE({ event: "reload", data: "" })
      }
      reloads.on("change", onChange)
      stream.onAbort(() => {
        reloads.off("change", onChange)
      })

      await stream.writeSSE({ event: "boot", data: BOOT_ID })
      while (!stream.closed) {
        await stream.writeSSE({ event: "ping", data: "" })
        await sleep(10_000)
      }

      reloads.off("change", onChange)
    }),
  )
}
