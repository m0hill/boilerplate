import { Context, Effect, Schema } from "effect"
import type { Message } from "@/resources/chat-room/room"

export class ChatRoomsError extends Schema.TaggedErrorClass<ChatRoomsError>()("ChatRoomsError", {
  reason: Schema.Literals(["read_failed", "write_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class ChatRooms extends Context.Service<
  ChatRooms,
  {
    readonly list: (room: string) => Effect.Effect<readonly Message[], ChatRoomsError>
    readonly post: (
      room: string,
      author: string,
      body: string,
    ) => Effect.Effect<void, ChatRoomsError>
    readonly publish: (room: string) => Effect.Effect<void, ChatRoomsError>
    readonly subscribe: (room: string) => Effect.Effect<ReadableStream<Uint8Array>, ChatRoomsError>
  }
>()("boilerplate/resources/chat-room/ChatRooms") {}

export function makeChatRooms(namespace: CloudflareBindings["CHAT_ROOM"]): ChatRooms["Service"] {
  const stubFor = (room: string) => namespace.get(namespace.idFromName(room))

  const list = (room: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).list(),
      catch: (cause) => new ChatRoomsError({ reason: "read_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.list"))

  const post = (room: string, author: string, body: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).post(author, body),
      catch: (cause) => new ChatRoomsError({ reason: "write_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.post"))

  const publish = (room: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).publish(),
      catch: (cause) => new ChatRoomsError({ reason: "write_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.publish"))

  const subscribe = (room: string) =>
    Effect.tryPromise({
      try: () => stubFor(room).subscribe(),
      catch: (cause) => new ChatRoomsError({ reason: "read_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.subscribe"))

  return ChatRooms.of({ list, post, publish, subscribe })
}
