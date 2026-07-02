import { event } from "datastar-kit"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarDone, datastarPage } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { liveView } from "@/lib/realtime/live-view"
import { LiveCounter, type LiveCounterError } from "@/resources/live-counter/live-counter"
import { pageHead } from "@/ui/head"
import { LiveCount } from "@/pages/live-counter/components/count"
import { LiveCounterPage } from "@/pages/live-counter/components/page"

const unavailable = Effect.fn("liveCounter.unavailable")(function* (
  action: string,
  error: LiveCounterError,
) {
  yield* annotate({
    liveCounter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("Live counter demo unavailable", { status: 503 })
})

const liveCounterPage = Effect.gen(function* () {
  const liveCounter = yield* LiveCounter
  const count = yield* liveCounter.current
  yield* annotate({ liveCounter: { ok: true, action: "view" } })

  return datastarPage(<LiveCounterPage count={count} />, {
    title: "Live counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("LiveCounterError", (error) => unavailable("view", error)),
  Effect.withSpan("liveCounter.page"),
)

const liveCounterStream = Effect.gen(function* () {
  const liveCounter = yield* LiveCounter

  return yield* liveView({
    subscribe: liveCounter.subscribe.pipe(
      Effect.tap(() => annotate({ liveCounter: { ok: true, action: "subscribe" } })),
    ),
    render: liveCounter.current.pipe(
      Effect.map((count) => event.patch(<LiveCount count={count} />)),
    ),
    log: { feature: "liveCounter" },
  })
}).pipe(
  Effect.catchTag("LiveCounterError", (error) => unavailable("subscribe", error)),
  Effect.withSpan("liveCounter.stream"),
)

const increment = Effect.gen(function* () {
  const liveCounter = yield* LiveCounter
  const result = yield* liveCounter.increment

  yield* annotate({
    liveCounter: { ok: result.publish.ok, action: "increment", publish: result.publish },
  })
  return datastarDone()
}).pipe(
  Effect.catchTag("LiveCounterError", (error) => unavailable("increment", error)),
  Effect.withSpan("liveCounter.increment"),
)

export const liveCounterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/live-counter", liveCounterPage),
  HttpRouter.add("GET", "/live-counter/stream", liveCounterStream),
  HttpRouter.add("POST", "/live-counter/increment", increment),
)
