import { Effect, Schema } from "effect"

const roomPattern = /^[a-z0-9][a-z0-9-]{0,31}$/

const RoomNameSchema = Schema.String.check(Schema.isPattern(roomPattern)).pipe(
  Schema.brand("RoomName"),
)

export type RoomName = Schema.Schema.Type<typeof RoomNameSchema>

export const maxAuthorLength = 40
export const maxBodyLength = 280

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
  readonly author: string
  readonly body: string
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
  const author = rawAuthor.trim()
  const body = rawBody.trim()

  if (author.length === 0) return yield* new InvalidMessageError({ reason: "empty_author" })
  if (body.length === 0) return yield* new InvalidMessageError({ reason: "empty_body" })
  if (author.length > maxAuthorLength || body.length > maxBodyLength) {
    return yield* new InvalidMessageError({ reason: "too_long" })
  }

  return { author, body }
})
