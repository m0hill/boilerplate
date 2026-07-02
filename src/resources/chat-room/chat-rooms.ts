import { Context, Effect, Option, Schema } from "effect"
import type { Message } from "@/resources/chat-room/room"
import {
  defaultRoom,
  type InvalidMessageError,
  type InvalidRoomError,
  type MessageAuthor,
  type MessageBody,
  parseMessage,
  parseRoom,
  type RoomName,
} from "@/resources/chat-room/rooms"

export type PostMessageInput = {
  readonly room: string
  readonly author: string
  readonly body: string
}

export class ChatRoomsError extends Schema.TaggedErrorClass<ChatRoomsError>()("ChatRoomsError", {
  reason: Schema.Literals(["read_failed", "write_failed"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export class ChatRooms extends Context.Service<
  ChatRooms,
  {
    readonly selectRoom: (room: Option.Option<string>) => Effect.Effect<RoomName>
    readonly list: (room: RoomName) => Effect.Effect<readonly Message[], ChatRoomsError>
    readonly post: (
      input: PostMessageInput,
    ) => Effect.Effect<RoomName, InvalidRoomError | InvalidMessageError | ChatRoomsError>
    readonly subscribe: (
      room: RoomName,
    ) => Effect.Effect<ReadableStream<Uint8Array>, ChatRoomsError>
  }
>()("boilerplate/resources/chat-room/ChatRooms") {}

export function makeChatRooms(namespace: CloudflareBindings["CHAT_ROOM"]): ChatRooms["Service"] {
  const stubFor = (room: RoomName) => namespace.get(namespace.idFromName(room))

  const selectRoom = (room: Option.Option<string>) =>
    Option.match(room, {
      onNone: () => Effect.succeed(defaultRoom),
      onSome: (rawRoom) => parseRoom(rawRoom).pipe(Effect.orElseSucceed(() => defaultRoom)),
    })

  const list = (room: RoomName) =>
    Effect.tryPromise({
      try: () => stubFor(room).list(),
      catch: (cause) => new ChatRoomsError({ reason: "read_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.list"))

  const postParsed = (room: RoomName, author: MessageAuthor, body: MessageBody) =>
    Effect.tryPromise({
      try: () => stubFor(room).post(author, body),
      catch: (cause) => new ChatRoomsError({ reason: "write_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.post"))

  const post = (input: PostMessageInput) =>
    Effect.gen(function* () {
      const room = yield* parseRoom(input.room)
      const message = yield* parseMessage(input.author, input.body)
      yield* postParsed(room, message.author, message.body)
      return room
    }).pipe(Effect.withSpan("ChatRooms.postMessage"))

  const subscribe = (room: RoomName) =>
    Effect.tryPromise({
      try: () => stubFor(room).subscribe(),
      catch: (cause) => new ChatRoomsError({ reason: "read_failed", cause }),
    }).pipe(Effect.withSpan("ChatRooms.subscribe"))

  return ChatRooms.of({ selectRoom, list, post, subscribe })
}
