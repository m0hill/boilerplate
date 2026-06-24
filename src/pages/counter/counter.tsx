import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarPage, datastarPatch } from "../../datastar.js"
import { pageHead } from "../../ui/head.js"
import { CounterStore, type CounterStoreError } from "./store.js"
import { CounterMain, CountView } from "./views.js"

type CounterAction = "view" | "increment"

const counterUnavailable = Effect.fn("counter.unavailable")(function* (
  action: CounterAction,
  error: CounterStoreError,
) {
  yield* Effect.annotateLogsScoped({
    counter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("Counter unavailable", { status: 503 })
})

const counterPage = Effect.gen(function* () {
  const counter = yield* CounterStore
  const count = yield* counter.current
  yield* Effect.annotateLogsScoped({ counter: { ok: true, action: "view" } })

  return datastarPage(<CounterMain count={count} />, {
    title: "KV counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("CounterStoreError", (error) => counterUnavailable("view", error)),
  Effect.withSpan("counter.page"),
)

const increment = Effect.gen(function* () {
  const counter = yield* CounterStore
  const count = yield* counter.increment
  yield* Effect.annotateLogsScoped({ counter: { ok: true, action: "increment" } })

  return datastarPatch(<CountView count={count} />)
}).pipe(
  Effect.catchTag("CounterStoreError", (error) => counterUnavailable("increment", error)),
  Effect.withSpan("counter.increment"),
)

export const counterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/counter", counterPage),
  HttpRouter.add("POST", "/counter/increment", increment),
)
