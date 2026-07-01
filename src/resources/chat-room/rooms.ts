import { Effect, Schema } from "effect"

const roomPattern = /^[a-z0-9][a-z0-9-]{0,31}$/

const RoomNameSchema = Schema.String.check(Schema.isPattern(roomPattern)).pipe(
  Schema.brand("RoomName"),
)

export type RoomName = Schema.Schema.Type<typeof RoomNameSchema>

export const maxAuthorLength = 40
export const maxBodyLength = 280

export const MessageAuthorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(maxAuthorLength),
).pipe(Schema.brand("MessageAuthor"))

export type MessageAuthor = Schema.Schema.Type<typeof MessageAuthorSchema>

export const MessageBodySchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(maxBodyLength),
).pipe(Schema.brand("MessageBody"))

export type MessageBody = Schema.Schema.Type<typeof MessageBodySchema>

export const defaultRoom = Schema.decodeUnknownSync(RoomNameSchema)("lobby")

export const presetRooms = [
  defaultRoom,
  Schema.decodeUnknownSync(RoomNameSchema)("general"),
  Schema.decodeUnknownSync(RoomNameSchema)("random"),
] as const

export class InvalidRoomError extends Schema.TaggedErrorClass<InvalidRoomError>()(
  "InvalidRoomError",
  { input: Schema.String },
) {}

export class InvalidMessageError extends Schema.TaggedErrorClass<InvalidMessageError>()(
  "InvalidMessageError",
  { reason: Schema.Literals(["empty_author", "empty_body", "too_long"]) },
) {}

type ParsedMessage = {
  readonly author: MessageAuthor
  readonly body: MessageBody
}

export const parseRoom = Effect.fn("parseRoom")(function* (
  input: string,
): Effect.fn.Return<RoomName, InvalidRoomError> {
  const room = input.trim().toLowerCase()
  return yield* Schema.decodeUnknownEffect(RoomNameSchema)(room).pipe(
    Effect.mapError(() => new InvalidRoomError({ input })),
  )
})

export const parseMessage = Effect.fn("parseMessage")(function* (
  rawAuthor: string,
  rawBody: string,
): Effect.fn.Return<ParsedMessage, InvalidMessageError> {
  const rawMessageAuthor = rawAuthor.trim()
  const rawMessageBody = rawBody.trim()

  const author = yield* Schema.decodeUnknownEffect(MessageAuthorSchema)(rawMessageAuthor).pipe(
    Effect.mapError(
      () =>
        new InvalidMessageError({
          reason: rawMessageAuthor.length === 0 ? "empty_author" : "too_long",
        }),
    ),
  )
  const body = yield* Schema.decodeUnknownEffect(MessageBodySchema)(rawMessageBody).pipe(
    Effect.mapError(
      () =>
        new InvalidMessageError({
          reason: rawMessageBody.length === 0 ? "empty_body" : "too_long",
        }),
    ),
  )

  return { author, body }
})
