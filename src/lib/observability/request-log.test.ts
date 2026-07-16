import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { annotateAction, makeRequestLog, RequestLog } from "@/lib/observability/request-log"

const runWithRequestLog = <A>(effect: Effect.Effect<A, never, RequestLog>) =>
  Effect.runSync(
    Effect.gen(function* () {
      const log = yield* makeRequestLog()
      const value = yield* effect.pipe(Effect.provideService(RequestLog, log))
      const snapshot = yield* log.snapshot

      return { snapshot, value }
    }),
  )

describe("request action log annotations", () => {
  it("annotates successful actions and preserves reserved fields", () => {
    const { snapshot, value } = runWithRequestLog(
      annotateAction("kvCounter", "increment")(Effect.succeed({ count: 7 }), ({ count }) => ({
        count,
        ok: "no",
      })),
    )

    expect(value).toEqual({ count: 7 })
    expect(snapshot).toEqual({
      kvCounter: { count: 7, ok: true, action: "increment" },
    })
  })

  it("annotates typed failures before re-failing", () => {
    const failure = { reason: "read_failed", cause: "storage unavailable" } as const
    const { snapshot, value } = runWithRequestLog(
      annotateAction(
        "kvCounter",
        "view",
      )(Effect.fail(failure)).pipe(Effect.catch((error) => Effect.succeed(error))),
    )

    expect(value).toBe(failure)
    expect(snapshot).toEqual({
      kvCounter: {
        ok: false,
        action: "view",
        reason: "read_failed",
        cause: "storage unavailable",
      },
    })
  })

  it("uses a failure mapper for effects with mixed error shapes", () => {
    const failure = { _tag: "ValidationError" } as const
    const { snapshot, value } = runWithRequestLog(
      annotateAction("lookup", "lookup")(Effect.fail(failure), {
        failure: (error) =>
          error._tag === "ValidationError" ? { reason: "invalid_repo" } : undefined,
      }).pipe(Effect.catch((error) => Effect.succeed(error))),
    )

    expect(value).toBe(failure)
    expect(snapshot).toEqual({
      lookup: { ok: false, action: "lookup", reason: "invalid_repo", cause: undefined },
    })
  })
})
