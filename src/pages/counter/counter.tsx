import { Effect, Layer, Result } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { reply } from "datastar-kit"
import { pageHead } from "../../ui/head.js"
import { currentCount, incrementCount } from "./store.js"
import { CounterMain, CountView } from "./views.js"

const counterPage = Effect.gen(function* () {
  const count = yield* Effect.result(currentCount)
  yield* Effect.annotateLogsScoped({ counter: { ok: Result.isSuccess(count), action: "view" } })

  return HttpServerResponse.raw(
    reply.page(<CounterMain count={Result.isSuccess(count) ? count.success : 0} />, {
      title: "KV counter",
      head: pageHead(),
    }),
  )
})

const increment = Effect.gen(function* () {
  const count = yield* Effect.result(incrementCount)
  yield* Effect.annotateLogsScoped({
    counter: { ok: Result.isSuccess(count), action: "increment" },
  })

  return HttpServerResponse.raw(
    reply.patch(<CountView count={Result.isSuccess(count) ? count.success : 0} />),
  )
})

/** Routes for the KV-backed counter demo page. */
export const counterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/counter", counterPage),
  HttpRouter.add("POST", "/counter/increment", increment),
)
