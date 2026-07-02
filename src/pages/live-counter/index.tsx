import { event } from "datastar-kit"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarDone, datastarPage } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import { liveView } from "@/lib/realtime/live-view"
import { LiveCounter } from "@/resources/live-counter/live-counter"
import { pageHead } from "@/ui/head"
import { LiveCount } from "@/pages/live-counter/components/count"
import { LiveCounterPage } from "@/pages/live-counter/components/page"

const unavailable = () =>
  Effect.succeed(HttpServerResponse.text("Live counter demo unavailable", { status: 503 }))

const liveCounterPage = Effect.gen(function* () {
  const liveCounter = yield* LiveCounter
  const count = yield* annotateAction("liveCounter", "view")(liveCounter.current)

  return datastarPage(<LiveCounterPage count={count} />, {
    title: "Live counter",
    head: pageHead(),
  })
}).pipe(Effect.catchTag("LiveCounterError", unavailable), Effect.withSpan("liveCounter.page"))

const liveCounterStream = Effect.gen(function* () {
  const liveCounter = yield* LiveCounter

  return yield* liveView({
    subscribe: annotateAction("liveCounter", "subscribe")(liveCounter.subscribe),
    render: liveCounter.current.pipe(
      Effect.map((count) => event.patch(<LiveCount count={count} />)),
    ),
    log: { feature: "liveCounter" },
  })
}).pipe(Effect.catchTag("LiveCounterError", unavailable), Effect.withSpan("liveCounter.stream"))

const increment = Effect.gen(function* () {
  const liveCounter = yield* LiveCounter
  yield* annotateAction("liveCounter", "increment")(
    liveCounter.increment,
    ({ count, publish }) => ({ count, publish }),
  )

  return datastarDone()
}).pipe(Effect.catchTag("LiveCounterError", unavailable), Effect.withSpan("liveCounter.increment"))

export const liveCounterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/live-counter", liveCounterPage),
  HttpRouter.add("GET", "/live-counter/stream", liveCounterStream),
  HttpRouter.add("POST", "/live-counter/increment", increment),
)
