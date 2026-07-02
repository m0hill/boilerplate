import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import { D1Counter } from "@/resources/d1/counter"
import { pageHead } from "@/ui/head"
import { D1Count } from "@/pages/d1-demo/components/count"
import { D1Page } from "@/pages/d1-demo/components/page"

const d1CounterUnavailable = () =>
  Effect.succeed(HttpServerResponse.text("D1 demo unavailable", { status: 503 }))

const d1DemoPage = Effect.gen(function* () {
  const counter = yield* D1Counter
  const count = yield* annotateAction("d1Counter", "view")(counter.current)

  return datastarPage(<D1Page count={count} />, {
    title: "D1 + Drizzle counter",
    head: pageHead(),
  })
}).pipe(Effect.catchTag("D1CounterError", d1CounterUnavailable), Effect.withSpan("d1Demo.page"))

const increment = Effect.gen(function* () {
  const counter = yield* D1Counter
  const count = yield* annotateAction("d1Counter", "increment")(counter.increment)

  return datastarPatch(<D1Count count={count} />)
}).pipe(
  Effect.catchTag("D1CounterError", d1CounterUnavailable),
  Effect.withSpan("d1Demo.increment"),
)

export const d1DemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/d1", d1DemoPage),
  HttpRouter.add("POST", "/d1/increment", increment),
)
