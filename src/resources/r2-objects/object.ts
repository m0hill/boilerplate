import { Effect, Schema } from "effect"

const keyPattern = /^[A-Za-z0-9][\w.\-/]*$/

export const maxKeyLength = 200
export const maxContentBytes = 4096

export class InvalidObjectError extends Schema.TaggedErrorClass<InvalidObjectError>()(
  "InvalidObjectError",
  {
    reason: Schema.Literals(["invalid_key", "empty_content", "content_too_large"]),
  },
) {}

type ParsedObject = {
  readonly key: string
  readonly content: string
}

export const parseObject = Effect.fn("parseObject")(function* (
  rawKey: string,
  rawContent: string,
): Effect.fn.Return<ParsedObject, InvalidObjectError> {
  const key = yield* parseObjectKey(rawKey)

  if (rawContent.length === 0) {
    return yield* new InvalidObjectError({ reason: "empty_content" })
  }
  if (new TextEncoder().encode(rawContent).byteLength > maxContentBytes) {
    return yield* new InvalidObjectError({ reason: "content_too_large" })
  }

  return { key, content: rawContent }
})

export const parseObjectKey = Effect.fn("parseObjectKey")(function* (
  rawKey: string,
): Effect.fn.Return<string, InvalidObjectError> {
  const key = rawKey.trim()
  if (key.length === 0 || key.length > maxKeyLength || !keyPattern.test(key)) {
    return yield* new InvalidObjectError({ reason: "invalid_key" })
  }
  return key
})
