import { Context, Effect, Schema } from "effect"

type LiveRoomsNamespace = CloudflareBindings["LIVE_ROOMS"]

export class LiveRoomError extends Schema.TaggedErrorClass<LiveRoomError>()("LiveRoomError", {
  reason: Schema.Literals(["subscribe_failed", "publish_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class LiveRooms extends Context.Service<
  LiveRooms,
  {
    readonly subscribe: (room: string) => Effect.Effect<ReadableStream<Uint8Array>, LiveRoomError>
    readonly publish: (room: string) => Effect.Effect<void, LiveRoomError>
  }
>()("boilerplate/pages/live-counter/LiveRooms") {}

export function makeLiveRooms(namespace: LiveRoomsNamespace): LiveRooms["Service"] {
  const stubFor = (room: string) => namespace.get(namespace.idFromName(room))

  const subscribe = (room: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).subscribe(),
      catch: (cause) => new LiveRoomError({ reason: "subscribe_failed", cause }),
    }).pipe(Effect.withSpan("LiveRooms.subscribe"))

  const publish = (room: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).publish(),
      catch: (cause) => new LiveRoomError({ reason: "publish_failed", cause }),
    }).pipe(Effect.withSpan("LiveRooms.publish"))

  return LiveRooms.of({ subscribe, publish })
}
