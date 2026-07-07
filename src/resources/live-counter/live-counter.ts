import { Context, Effect, Result, Schema } from "effect"
import { D1Counter, makeD1Counter, type D1CounterError } from "@/resources/d1/counter"
import { makeD1Database } from "@/resources/d1/database"
import {
  LiveRooms,
  liveRoomName,
  makeLiveRooms,
  type LiveRoomError,
} from "@/resources/live-rooms/live-rooms"

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

export class LiveCounter extends Context.Service<
  LiveCounter,
  {
    readonly current: Effect.Effect<number, LiveCounterError>
    readonly subscribe: Effect.Effect<ReadableStream<Uint8Array>, LiveCounterError>
    readonly increment: Effect.Effect<LiveCounterIncrement, LiveCounterError>
  }
>()("boilerplate/resources/live-counter/LiveCounter") {}

export function makeLiveCounter(
  counter: D1Counter["Service"],
  rooms: LiveRooms["Service"],
): LiveCounter["Service"] {
  const current = counter.current.pipe(
    Effect.mapError(d1CounterError),
    Effect.withSpan("LiveCounter.current"),
  )

  const subscribe = rooms
    .subscribe(COUNTER_ROOM)
    .pipe(Effect.mapError(subscribeError), Effect.withSpan("LiveCounter.subscribe"))

  const increment = Effect.gen(function* () {
    const count = yield* counter.increment.pipe(Effect.mapError(d1CounterError))
    const publish = yield* Effect.result(rooms.publish(COUNTER_ROOM))

    return {
      count,
      publish: Result.match(publish, {
        onFailure: publishFailure,
        onSuccess: (): LiveCounterPublish => ({ ok: true }),
      }),
    }
  }).pipe(Effect.withSpan("LiveCounter.increment"))

  return LiveCounter.of({ current, subscribe, increment })
}

export function makeLiveCounterContext(env: Pick<CloudflareBindings, "APP_DB" | "LIVE_ROOMS">) {
  const database = makeD1Database(env.APP_DB)
  const d1Counter = makeD1Counter(database)
  const liveRooms = makeLiveRooms(env.LIVE_ROOMS)

  return Context.empty().pipe(
    Context.add(LiveRooms, liveRooms),
    Context.add(LiveCounter, makeLiveCounter(d1Counter, liveRooms)),
  )
}
