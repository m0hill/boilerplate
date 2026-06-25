import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "../../datastar.js"
import { pageHead } from "../../ui/head.js"
import { D1CounterStore, type D1CounterStoreError } from "./store.js"
import { D1CountView, D1DemoMain } from "./views.js"

type D1CounterAction = "view" | "increment"

const d1CounterUnavailable = Effect.fn("d1Demo.unavailable")(function* (
  action: D1CounterAction,
  error: D1CounterStoreError,
) {
  yield* Effect.annotateLogsScoped({
    d1Counter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("D1 demo unavailable", { status: 503 })
})

const d1DemoPage = Effect.gen(function* () {
  const counter = yield* D1CounterStore
  const count = yield* counter.current
  yield* Effect.annotateLogsScoped({ d1Counter: { ok: true, action: "view" } })

  return datastarPage(<D1DemoMain count={count} />, {
    title: "D1 demo",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("D1CounterStoreError", (error) => d1CounterUnavailable("view", error)),
  Effect.withSpan("d1Demo.page"),
)

const increment = Effect.gen(function* () {
  const counter = yield* D1CounterStore
  const count = yield* counter.increment
  yield* Effect.annotateLogsScoped({ d1Counter: { ok: true, action: "increment" } })

  return datastarPatch(<D1CountView count={count} />)
}).pipe(
  Effect.catchTag("D1CounterStoreError", (error) => d1CounterUnavailable("increment", error)),
  Effect.withSpan("d1Demo.increment"),
)

export const d1DemoRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/d1", d1DemoPage),
  HttpRouter.add("POST", "/d1/increment", increment),
)
