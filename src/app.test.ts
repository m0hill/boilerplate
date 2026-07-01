import { env } from "cloudflare:workers"
import { Context, Effect } from "effect"
import { describe, expect, it } from "vitest"
import { makeRequestContext } from "@/app"
import { KvCounter } from "@/resources/kv-counter/kv-counter"
import { loadAppWithContext, request } from "@/test/utils"

describe("app seam", () => {
  it("can run routes with an explicit service context", async () => {
    const makeContext = () =>
      makeRequestContext(env).pipe(
        Context.add(
          KvCounter,
          KvCounter.of({
            current: Effect.succeed(41),
            increment: Effect.succeed(42),
          }),
        ),
      )
    const app = await loadAppWithContext(makeContext)

    const response = await app.fetch(request("/kv"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain(
      '<output id="kv-count" class="text-5xl font-bold tabular-nums">41</output>',
    )
  })
})
