import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "../../lib/datastar.js"
import { annotate } from "../../lib/observability/request-log.js"
import { KvCounter, type KvCounterError } from "../../services/kv-counter/kv-counter.js"
import { pageHead } from "../../ui/head.js"
import { KvCount } from "./components/count.js"
import { KvPage } from "./components/page.js"

type CounterAction = "view" | "increment"

const counterUnavailable = Effect.fn("kvDemo.unavailable")(function* (
  action: CounterAction,
  error: KvCounterError,
) {
  yield* annotate({
    kvCounter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("KV demo unavailable", { status: 503 })
})

const kvDemoPage = Effect.gen(function* () {
  const counter = yield* KvCounter
  const count = yield* counter.current
  yield* annotate({ kvCounter: { ok: true, action: "view" } })

  return datastarPage(<KvPage count={count} />, {
    title: "KV counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("KvCounterError", (error) => counterUnavailable("view", error)),
  Effect.withSpan("kvDemo.page"),
)

const increment = Effect.gen(function* () {
  const counter = yield* KvCounter
  const count = yield* counter.increment
  yield* annotate({ kvCounter: { ok: true, action: "increment" } })

  return datastarPatch(<KvCount count={count} />)
}).pipe(
  Effect.catchTag("KvCounterError", (error) => counterUnavailable("increment", error)),
  Effect.withSpan("kvDemo.increment"),
)

export const kvDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/kv", kvDemoPage),
  HttpRouter.add("POST", "/kv/increment", increment),
)
