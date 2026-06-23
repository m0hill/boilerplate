import { describe, expect, it, afterEach, vi } from "vitest"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { request } from "../test-utils.js"
import { initLog, type WideEvent } from "./log.js"
import { logger, type LoggerVariables } from "./hono.js"

type TestEnv = {
  Variables: LoggerVariables
}

const isWideEvent = (value: unknown): value is WideEvent =>
  value !== null && typeof value === "object" && "timestamp" in value && "level" in value

const firstLoggedEvent = (calls: ReadonlyArray<readonly unknown[]>): WideEvent => {
  const event = calls.flat().find(isWideEvent)
  if (!event) throw new Error("Expected a logged wide event")
  return event
}

afterEach(() => {
  vi.restoreAllMocks()
  initLog({ silent: true })
})

describe("logger middleware", () => {
  it("attaches a request logger and emits one event after the response", async () => {
    initLog({
      service: "hono-test",
      environment: "test",
      pretty: false,
      silent: false,
    })
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})
    const app: Hono<TestEnv> = new Hono<TestEnv>()

    app.use(
      logger({
        headers: ["user-agent", "authorization"],
      }),
    )
    app.get("/users/:id", (c) => {
      c.get("log").set({ user: { id: c.req.param("id") } })
      return c.text("ok")
    })

    const response = await app.fetch(
      request("/users/42", {
        headers: {
          authorization: "Bearer secret",
          "user-agent": "vitest",
          "x-request-id": "req_123",
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("x-request-id")).toBe("req_123")
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(firstLoggedEvent(consoleInfo.mock.calls)).toMatchObject({
      level: "info",
      service: "hono-test",
      environment: "test",
      method: "GET",
      path: "/users/42",
      status: 200,
      requestId: "req_123",
      requestHeaders: {
        authorization: "[REDACTED]",
        "user-agent": "vitest",
      },
      user: { id: "42" },
    })
  })

  it("records thrown HTTP errors with the final status", async () => {
    initLog({
      service: "hono-test",
      environment: "test",
      pretty: false,
      silent: false,
    })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const app: Hono<TestEnv> = new Hono<TestEnv>()

    app.use(logger())
    app.get("/teapot", () => {
      throw new HTTPException(418, { message: "Short and stout" })
    })

    const response = await app.fetch(request("/teapot"))

    expect(response.status).toBe(418)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(firstLoggedEvent(consoleError.mock.calls)).toMatchObject({
      level: "error",
      path: "/teapot",
      status: 418,
      error: { message: "Short and stout" },
    })
  })

  it("defers event emission for event streams until the body closes", async () => {
    initLog({
      service: "hono-test",
      environment: "test",
      pretty: false,
      silent: false,
    })
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})
    const app: Hono<TestEnv> = new Hono<TestEnv>()
    const encoder = new TextEncoder()

    app.use(logger())
    app.get("/events", (c) => {
      c.get("log").set({ stream: { kind: "sse" } })
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode("data: ok\n\n"))
            controller.close()
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      )
    })

    const response = await app.fetch(request("/events"))

    expect(consoleInfo).not.toHaveBeenCalled()
    await expect(response.text()).resolves.toBe("data: ok\n\n")
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(firstLoggedEvent(consoleInfo.mock.calls)).toMatchObject({
      path: "/events",
      status: 200,
      stream: { kind: "sse" },
    })
  })

  it("provides a no-op logger on excluded routes", async () => {
    initLog({ pretty: false, silent: false })
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {})
    const app: Hono<TestEnv> = new Hono<TestEnv>()

    app.use(logger({ exclude: ["/health"] }))
    app.get("/health", (c) => {
      c.get("log").set({ health: true })
      return c.text("ok")
    })

    const response = await app.fetch(request("/health"))

    expect(response.status).toBe(200)
    expect(consoleInfo).not.toHaveBeenCalled()
  })
})
