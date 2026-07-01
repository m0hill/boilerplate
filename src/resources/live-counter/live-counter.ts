import { Effect, Result, Schema } from "effect"
import { D1Counter, type D1CounterError } from "@/resources/d1/counter"
import { LiveRooms, liveRoomName, type LiveRoomError } from "@/resources/live-rooms/live-rooms"

const COUNTER_ROOM = liveRoomName("counter")

export class LiveCounterError extends Schema.TaggedErrorClass<LiveCounterError>()(
  "LiveCounterError",
  {
    reason: Schema.Literals(["read_failed", "write_failed", "invalid_row", "subscribe_failed"]),
    cause: Schema.optionalKey(Schema.Defect()),
  },
) {}

export type LiveCounterPublish =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "publish_failed"; readonly cause?: unknown }

export type LiveCounterIncrement = {
  readonly count: number
  readonly publish: LiveCounterPublish
}

const liveCounterError = (reason: LiveCounterError["reason"], cause?: unknown): LiveCounterError =>
  cause === undefined ? new LiveCounterError({ reason }) : new LiveCounterError({ reason, cause })

const d1CounterError = (error: D1CounterError): LiveCounterError =>
  liveCounterError(error.reason, error.cause)

const subscribeError = (error: LiveRoomError): LiveCounterError =>
  liveCounterError("subscribe_failed", error.cause)

const publishFailure = (error: LiveRoomError): LiveCounterPublish =>
  error.cause === undefined
    ? { ok: false, reason: "publish_failed" }
    : { ok: false, reason: "publish_failed", cause: error.cause }

export const liveCounterCurrent = Effect.gen(function* () {
  const counter = yield* D1Counter
  return yield* counter.current
}).pipe(Effect.mapError(d1CounterError), Effect.withSpan("LiveCounter.current"))

export const liveCounterSubscribe = Effect.gen(function* () {
  const rooms = yield* LiveRooms
  return yield* rooms.subscribe(COUNTER_ROOM)
}).pipe(Effect.mapError(subscribeError), Effect.withSpan("LiveCounter.subscribe"))

export const liveCounterIncrement = Effect.gen(function* (): Effect.fn.Return<
  LiveCounterIncrement,
  LiveCounterError,
  D1Counter | LiveRooms
> {
  const counter = yield* D1Counter
  const count = yield* counter.increment.pipe(Effect.mapError(d1CounterError))

  const rooms = yield* LiveRooms
  const publish = yield* Effect.result(rooms.publish(COUNTER_ROOM))

  return {
    count,
    publish: Result.match(publish, {
      onFailure: publishFailure,
      onSuccess: () => ({ ok: true }),
    }),
  }
}).pipe(Effect.withSpan("LiveCounter.increment"))
