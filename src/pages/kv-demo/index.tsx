import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import { KvCounter } from "@/resources/kv-counter/kv-counter"
import { pageHead } from "@/ui/head"
import { KvCount } from "@/pages/kv-demo/components/count"
import { KvPage } from "@/pages/kv-demo/components/page"

const counterUnavailable = () =>
  Effect.succeed(HttpServerResponse.text("KV demo unavailable", { status: 503 }))

const kvDemoPage = Effect.gen(function* () {
  const counter = yield* KvCounter
  const count = yield* annotateAction("kvCounter", "view")(counter.current)

  return datastarPage(<KvPage count={count} />, {
    title: "KV counter",
    head: pageHead(),
  })
}).pipe(Effect.catchTag("KvCounterError", counterUnavailable), Effect.withSpan("kvDemo.page"))

const increment = Effect.gen(function* () {
  const counter = yield* KvCounter
  const count = yield* annotateAction("kvCounter", "increment")(counter.increment)

  return datastarPatch(<KvCount count={count} />)
}).pipe(Effect.catchTag("KvCounterError", counterUnavailable), Effect.withSpan("kvDemo.increment"))

export const kvDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/kv", kvDemoPage),
  HttpRouter.add("POST", "/kv/increment", increment),
)
