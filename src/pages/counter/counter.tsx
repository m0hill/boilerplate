import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { reply } from "datastar-kit"
import { pageHead } from "../../ui/head.js"
import { currentCount, incrementCount, type CounterStoreError } from "./store.js"
import { CounterMain, CountView } from "./views.js"

type CounterAction = "view" | "increment"
type CounterStoreReason = CounterStoreError["reason"]

const counterUnavailable = Effect.fn("counter.counterUnavailable")(function* (
  action: CounterAction,
  reason: CounterStoreReason,
) {
  yield* Effect.annotateLogsScoped({ counter: { ok: false, action, reason } })
  return HttpServerResponse.text("Counter unavailable", { status: 503 })
})

const counterPage = Effect.gen(function* () {
  const count = yield* currentCount
  yield* Effect.annotateLogsScoped({ counter: { ok: true, action: "view" } })

  return HttpServerResponse.raw(
    reply.page(<CounterMain count={count} />, {
      title: "KV counter",
      head: pageHead(),
    }),
  )
}).pipe(Effect.catchTag("CounterStoreError", (error) => counterUnavailable("view", error.reason)))

const increment = Effect.gen(function* () {
  const count = yield* incrementCount
  yield* Effect.annotateLogsScoped({ counter: { ok: true, action: "increment" } })

  return HttpServerResponse.raw(reply.patch(<CountView count={count} />))
}).pipe(
  Effect.catchTag("CounterStoreError", (error) => counterUnavailable("increment", error.reason)),
)

/** Routes for the KV-backed counter demo page. */
export const counterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/counter", counterPage),
  HttpRouter.add("POST", "/counter/increment", increment),
)
