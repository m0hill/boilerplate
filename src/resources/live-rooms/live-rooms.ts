import { Context, Effect, Schema } from "effect"

const LiveRoomNameSchema = Schema.NonEmptyString.pipe(Schema.brand("LiveRoomName"))

export type LiveRoomName = Schema.Schema.Type<typeof LiveRoomNameSchema>

export const liveRoomName = Schema.decodeUnknownSync(LiveRoomNameSchema)

export class LiveRoomError extends Schema.TaggedErrorClass<LiveRoomError>()("LiveRoomError", {
  reason: Schema.Literals(["subscribe_failed", "publish_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class LiveRooms extends Context.Service<
  LiveRooms,
  {
    readonly subscribe: (
      room: LiveRoomName,
    ) => Effect.Effect<ReadableStream<Uint8Array>, LiveRoomError>
    readonly publish: (room: LiveRoomName) => Effect.Effect<void, LiveRoomError>
  }
>()("boilerplate/resources/live-rooms/LiveRooms") {}

export function makeLiveRooms(namespace: CloudflareBindings["LIVE_ROOMS"]): LiveRooms["Service"] {
  const stubFor = (room: LiveRoomName) => namespace.get(namespace.idFromName(room))

  const subscribe = (room: LiveRoomName) =>
    Effect.tryPromise({
      try: () => stubFor(room).subscribe(),
      catch: (cause) => new LiveRoomError({ reason: "subscribe_failed", cause }),
    }).pipe(Effect.withSpan("LiveRooms.subscribe"))

  const publish = (room: LiveRoomName) =>
    Effect.tryPromise({
      try: () => stubFor(room).publish(),
      catch: (cause) => new LiveRoomError({ reason: "publish_failed", cause }),
    }).pipe(Effect.withSpan("LiveRooms.publish"))

  return LiveRooms.of({ subscribe, publish })
}
