import { describe, expect, it, vi, afterEach } from "vitest"
import { createLogger, initLog } from "./log.js"

const fixedNow = (): Date => new Date("2026-06-23T12:00:00.000Z")

const clockWithDuration = (durationMs: number): (() => number) => {
  let calls = 0
  return () => {
    calls += 1
    return calls === 1 ? 100 : 100 + durationMs
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  initLog({ silent: true })
})

describe("createLogger", () => {
  it("emits one redacted wide event with merged context", () => {
    initLog({
      service: "test-app",
      environment: "test",
      silent: true,
    })

    const log = createLogger(
      { method: "POST", path: "/increment", requestId: "req_123" },
      { now: fixedNow, clock: clockWithDuration(37) },
    )
    log.set({ user: { id: "user_1", token: "secret" } })
    log.warn("Invalid counter step", { counter: { accepted: false } })

    expect(log.emit({ status: 200 })).toMatchObject({
      timestamp: "2026-06-23T12:00:00.000Z",
      level: "warn",
      service: "test-app",
      environment: "test",
      method: "POST",
      path: "/increment",
      requestId: "req_123",
      status: 200,
      duration: "37ms",
      durationMs: 37,
      user: { id: "user_1", token: "[REDACTED]" },
      counter: { accepted: false },
      logs: [
        {
          level: "warn",
          message: "Invalid counter step",
        },
      ],
    })
  })

  it("tail-samples boring events while keeping matching rules", () => {
    initLog({
      service: "test-app",
      environment: "test",
      silent: true,
      sample: { rate: 0, keep: [{ status: 500 }] },
    })

    const boring = createLogger({}, { now: fixedNow, clock: clockWithDuration(1) })
    const failing = createLogger({}, { now: fixedNow, clock: clockWithDuration(1) })

    expect(boring.emit({ status: 200 })).toBeNull()
    expect(failing.emit({ status: 503 })).toMatchObject({ status: 503 })
  })

  it("prints an evlog-style tree in pretty mode", () => {
    initLog({
      service: "test-app",
      environment: "development",
      pretty: true,
      silent: false,
    })
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {})

    const log = createLogger(
      { method: "GET", path: "/pretty", requestId: "req_123" },
      { now: fixedNow, clock: clockWithDuration(25) },
    )
    log.set({ user: { id: "42" } })
    log.emit({ status: 200 })

    const output = consoleLog.mock.calls
      .flat()
      .find((value): value is string => typeof value === "string")
    expect(output).toContain("INFO [test-app] GET /pretty 200 in 25ms")
    expect(output).toContain('├─ requestId: "req_123"')
    expect(output).toContain('└─ user: { id: "42" }')
  })
})
