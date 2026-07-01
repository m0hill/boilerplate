import { Effect, Schema } from "effect"

const keyPattern = /^[A-Za-z0-9][\w.\-/]*$/

export const maxKeyLength = 200
export const maxContentBytes = 4096

const ObjectKeySchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(maxKeyLength),
  Schema.isPattern(keyPattern),
).pipe(Schema.brand("ObjectKey"))

export type ObjectKey = Schema.Schema.Type<typeof ObjectKeySchema>

const ObjectContentSchema = Schema.NonEmptyString.pipe(Schema.brand("ObjectContent"))

export type ObjectContent = Schema.Schema.Type<typeof ObjectContentSchema>

export class InvalidObjectError extends Schema.TaggedErrorClass<InvalidObjectError>()(
  "InvalidObjectError",
  {
    reason: Schema.Literals(["invalid_key", "empty_content", "content_too_large"]),
  },
) {}

type ParsedObject = {
  readonly key: ObjectKey
  readonly content: ObjectContent
}

export const parseObject = Effect.fn("parseObject")(function* (
  rawKey: string,
  rawContent: string,
): Effect.fn.Return<ParsedObject, InvalidObjectError> {
  const key = yield* parseObjectKey(rawKey)

  const content = yield* Schema.decodeUnknownEffect(ObjectContentSchema)(rawContent).pipe(
    Effect.mapError(() => new InvalidObjectError({ reason: "empty_content" })),
  )
  if (new TextEncoder().encode(content).byteLength > maxContentBytes) {
    return yield* new InvalidObjectError({ reason: "content_too_large" })
  }

  return { key, content }
})

export const parseObjectKey = Effect.fn("parseObjectKey")(function* (
  rawKey: string,
): Effect.fn.Return<ObjectKey, InvalidObjectError> {
  const key = rawKey.trim()
  return yield* Schema.decodeUnknownEffect(ObjectKeySchema)(key).pipe(
    Effect.mapError(() => new InvalidObjectError({ reason: "invalid_key" })),
  )
})
