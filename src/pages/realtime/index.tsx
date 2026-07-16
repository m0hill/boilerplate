import { event } from "datastar-kit"
import { Effect, Layer, Stream } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { datastarDone, datastarLiveStream, datastarPage } from "@/lib/datastar"
import { annotateAction } from "@/lib/observability/request-log"
import { RealtimeCount } from "@/pages/realtime/components/count"
import { RealtimePage } from "@/pages/realtime/components/page"
import { RealtimeCounter } from "@/services/realtime-counter/realtime-counter"
import { pageHead } from "@/ui/head"

const realtimeUnavailable = () =>
  Effect.succeed(HttpServerResponse.text("Realtime counter unavailable", { status: 503 }))

const realtimePage = Effect.sync(() =>
  datastarPage(<RealtimePage />, {
    title: "SQLite realtime counter",
    head: pageHead(),
  }),
)

const stream = Effect.gen(function* () {
  const counter = yield* RealtimeCounter
  const events = counter.changes.pipe(
    Stream.map((count) => event.patch(<RealtimeCount count={count} />)),
  )

  return datastarLiveStream(events, {
    heartbeat: { intervalMs: 15_000, comment: "sqlite-realtime-counter" },
  })
}).pipe(Effect.withSpan("realtime.stream"))

const increment = Effect.gen(function* () {
  const counter = yield* RealtimeCounter
  yield* annotateAction("realtimeCounter", "increment")(counter.increment)
  return datastarDone()
}).pipe(
  Effect.catchTag("SqliteCounterError", realtimeUnavailable),
  Effect.withSpan("realtime.increment"),
)

export const realtimeRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/realtime", realtimePage),
  HttpRouter.add("GET", "/realtime/stream", stream),
  HttpRouter.add("POST", "/realtime/increment", increment),
)
