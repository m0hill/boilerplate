import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "../../datastar.js"
import { pageHead } from "../../ui/head.js"
import { KvCounterStore, type KvCounterStoreError } from "./store.js"
import { KvCountView, KvDemoMain } from "./views.js"

type CounterAction = "view" | "increment"

const counterUnavailable = Effect.fn("kvDemo.unavailable")(function* (
  action: CounterAction,
  error: KvCounterStoreError,
) {
  yield* Effect.annotateLogsScoped({
    kvCounter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("KV demo unavailable", { status: 503 })
})

const kvDemoPage = Effect.gen(function* () {
  const counter = yield* KvCounterStore
  const count = yield* counter.current
  yield* Effect.annotateLogsScoped({ kvCounter: { ok: true, action: "view" } })

  return datastarPage(<KvDemoMain count={count} />, {
    title: "KV counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("KvCounterStoreError", (error) => counterUnavailable("view", error)),
  Effect.withSpan("kvDemo.page"),
)

const increment = Effect.gen(function* () {
  const counter = yield* KvCounterStore
  const count = yield* counter.increment
  yield* Effect.annotateLogsScoped({ kvCounter: { ok: true, action: "increment" } })

  return datastarPatch(<KvCountView count={count} />)
}).pipe(
  Effect.catchTag("KvCounterStoreError", (error) => counterUnavailable("increment", error)),
  Effect.withSpan("kvDemo.increment"),
)

export const kvDemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/kv", kvDemoPage),
  HttpRouter.add("POST", "/kv/increment", increment),
)
