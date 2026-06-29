import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { D1Counter, type D1CounterError } from "@/resources/d1/counter"
import { pageHead } from "@/ui/head"
import { D1Count } from "@/pages/d1-demo/components/count"
import { D1Page } from "@/pages/d1-demo/components/page"

const d1CounterUnavailable = Effect.fn("d1Demo.unavailable")(function* (
  action: "view" | "increment",
  error: D1CounterError,
) {
  yield* annotate({
    d1Counter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("D1 demo unavailable", { status: 503 })
})

const d1DemoPage = Effect.gen(function* () {
  const counter = yield* D1Counter
  const count = yield* counter.current
  yield* annotate({ d1Counter: { ok: true, action: "view" } })

  return datastarPage(<D1Page count={count} />, {
    title: "D1 + Drizzle counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("D1CounterError", (error) => d1CounterUnavailable("view", error)),
  Effect.withSpan("d1Demo.page"),
)

const increment = Effect.gen(function* () {
  const counter = yield* D1Counter
  const count = yield* counter.increment
  yield* annotate({ d1Counter: { ok: true, action: "increment" } })

  return datastarPatch(<D1Count count={count} />)
}).pipe(
  Effect.catchTag("D1CounterError", (error) => d1CounterUnavailable("increment", error)),
  Effect.withSpan("d1Demo.increment"),
)

export const d1DemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/d1", d1DemoPage),
  HttpRouter.add("POST", "/d1/increment", increment),
)
