import { Context, Effect, Schema } from "effect"
import type { Message } from "./room.js"

type RoomNamespace = CloudflareBindings["CHAT_ROOM"]

export class DoRoomError extends Schema.TaggedErrorClass<DoRoomError>()("DoRoomError", {
  reason: Schema.Literals(["read_failed", "write_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class RoomClient extends Context.Service<
  RoomClient,
  {
    readonly list: (room: string) => Effect.Effect<readonly Message[], DoRoomError>
    readonly post: (
      room: string,
      author: string,
      body: string,
    ) => Effect.Effect<readonly Message[], DoRoomError>
    readonly subscribe: (
      room: string,
      initialEvents: string,
    ) => Effect.Effect<Response, DoRoomError>
    readonly publish: (room: string, events: string) => Effect.Effect<boolean, DoRoomError>
  }
>()("boilerplate/pages/do-demo/RoomClient") {}

export function makeRoomClient(namespace: RoomNamespace): RoomClient["Service"] {
  const stubFor = (room: string) => namespace.get(namespace.idFromName(room))

  const list = (room: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).list(),
      catch: (cause) => new DoRoomError({ reason: "read_failed", cause }),
    }).pipe(Effect.withSpan("RoomClient.list"))

  const post = (room: string, author: string, body: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).post(author, body),
      catch: (cause) => new DoRoomError({ reason: "write_failed", cause }),
    }).pipe(Effect.withSpan("RoomClient.post"))

  const subscribe = (room: string, initialEvents: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).subscribe(initialEvents),
      catch: (cause) => new DoRoomError({ reason: "read_failed", cause }),
    }).pipe(Effect.withSpan("RoomClient.subscribe"))

  const publish = (room: string, events: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).publish(events),
      catch: (cause) => new DoRoomError({ reason: "write_failed", cause }),
    }).pipe(Effect.withSpan("RoomClient.publish"))

  return RoomClient.of({ list, post, subscribe, publish })
}
