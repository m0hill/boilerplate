import { event } from "datastar-kit"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { waitUntil } from "@/lib/cloudflare"
import { datastarDone, datastarPage } from "@/lib/datastar"
import { annotate } from "@/lib/observability/request-log"
import { liveView } from "@/lib/realtime/live-view"
import { D1Counter, type D1CounterError } from "@/resources/d1/counter"
import { LiveRooms, type LiveRoomError } from "@/resources/live-rooms/live-rooms"
import { pageHead } from "@/ui/head"
import { LiveCount } from "@/pages/live-counter/components/count"
import { LiveCounterPage } from "@/pages/live-counter/components/page"

const COUNTER_ROOM = "counter"

const unavailable = Effect.fn("liveCounter.unavailable")(function* (
  action: string,
  error: D1CounterError | LiveRoomError,
) {
  yield* annotate({
    liveCounter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("Live counter demo unavailable", { status: 503 })
})

const liveCounterPage = Effect.gen(function* () {
  const counter = yield* D1Counter
  const count = yield* counter.current
  yield* annotate({ liveCounter: { ok: true, action: "view" } })

  return datastarPage(<LiveCounterPage count={count} />, {
    title: "Live counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("D1CounterError", (error) => unavailable("view", error)),
  Effect.withSpan("liveCounter.page"),
)

const liveCounterStream = Effect.gen(function* () {
  const counter = yield* D1Counter
  const rooms = yield* LiveRooms

  const pulses = yield* rooms.subscribe(COUNTER_ROOM)
  yield* annotate({ liveCounter: { ok: true, action: "subscribe" } })

  return yield* liveView({
    pulses,
    render: counter.current.pipe(Effect.map((count) => event.patch(<LiveCount count={count} />))),
    log: { feature: "liveCounter", room: COUNTER_ROOM },
  })
}).pipe(
  Effect.catchTag("LiveRoomError", (error) => unavailable("subscribe", error)),
  Effect.withSpan("liveCounter.stream"),
)

const increment = Effect.gen(function* () {
  const counter = yield* D1Counter
  yield* counter.increment
  const rooms = yield* LiveRooms

  yield* waitUntil(rooms.publish(COUNTER_ROOM))

  yield* annotate({ liveCounter: { ok: true, action: "increment" } })
  return datastarDone()
}).pipe(
  Effect.catchTag("D1CounterError", (error) => unavailable("increment", error)),
  Effect.withSpan("liveCounter.increment"),
)

export const liveCounterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/live-counter", liveCounterPage),
  HttpRouter.add("GET", "/live-counter/stream", liveCounterStream),
  HttpRouter.add("POST", "/live-counter/increment", increment),
)
