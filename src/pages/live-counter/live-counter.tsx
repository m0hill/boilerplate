import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { event } from "datastar-kit"
import { datastarDone, datastarPage } from "../../datastar.js"
import { D1CounterStore, type D1CounterStoreError } from "../d1-demo/store.js"
import { annotate } from "../../observability/request-log.js"
import { liveView } from "../../realtime/live-view.js"
import { pageHead } from "../../ui/head.js"
import { LiveRooms, type LiveRoomError } from "./live-rooms.js"
import { LiveCounterMain, LiveCountView } from "./views.js"

const COUNTER_ROOM = "counter"

const unavailable = Effect.fn("liveCounter.unavailable")(function* (
  action: string,
  error: D1CounterStoreError | LiveRoomError,
) {
  yield* annotate({
    liveCounter: { ok: false, action, reason: error.reason, cause: error.cause },
  })
  return HttpServerResponse.text("Live counter demo unavailable", { status: 503 })
})

const liveCounterPage = Effect.gen(function* () {
  const counter = yield* D1CounterStore
  const count = yield* counter.current
  yield* annotate({ liveCounter: { ok: true, action: "view" } })

  return datastarPage(<LiveCounterMain count={count} />, {
    title: "Live counter",
    head: pageHead(),
  })
}).pipe(
  Effect.catchTag("D1CounterStoreError", (error) => unavailable("view", error)),
  Effect.withSpan("liveCounter.page"),
)

const liveCounterStream = Effect.gen(function* () {
  const counter = yield* D1CounterStore
  const rooms = yield* LiveRooms

  const pulses = yield* rooms.subscribe(COUNTER_ROOM)
  yield* annotate({ liveCounter: { ok: true, action: "subscribe" } })

  return yield* liveView({
    pulses,
    render: counter.current.pipe(
      Effect.map((count) => event.patch(<LiveCountView count={count} />)),
    ),
    log: { feature: "liveCounter", room: COUNTER_ROOM },
  })
}).pipe(
  Effect.catchTag("LiveRoomError", (error) => unavailable("subscribe", error)),
  Effect.withSpan("liveCounter.stream"),
)

const increment = Effect.gen(function* () {
  const counter = yield* D1CounterStore
  yield* counter.increment
  const rooms = yield* LiveRooms

  yield* rooms.publish(COUNTER_ROOM).pipe(
    Effect.catchTag("LiveRoomError", (error) =>
      annotate({
        liveCounter: { ok: false, action: "publish", reason: error.reason, cause: error.cause },
      }).pipe(Effect.as(false)),
    ),
  )

  yield* annotate({ liveCounter: { ok: true, action: "increment" } })
  return datastarDone()
}).pipe(
  Effect.catchTag("D1CounterStoreError", (error) => unavailable("increment", error)),
  Effect.withSpan("liveCounter.increment"),
)

export const liveCounterRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/live-counter", liveCounterPage),
  HttpRouter.add("GET", "/live-counter/stream", liveCounterStream),
  HttpRouter.add("POST", "/live-counter/increment", increment),
)
