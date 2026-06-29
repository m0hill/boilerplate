import { Effect, Schema } from "effect"
import { read, reply } from "datastar-kit"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

export class InvalidSignalsError extends Schema.TaggedErrorClass<InvalidSignalsError>()(
  "InvalidSignalsError",
  {
    cause: Schema.Defect(),
  },
) {}

export const decodeSignals = Effect.fn("decodeSignals")(function* <S extends Schema.Top>(
  request: HttpServerRequest.HttpServerRequest,
  schema: S,
): Effect.fn.Return<S["Type"], InvalidSignalsError, S["DecodingServices"]> {
  const webRequest = yield* HttpServerRequest.toWeb(request).pipe(
    Effect.mapError((cause) => new InvalidSignalsError({ cause })),
  )
  const signals = yield* Effect.tryPromise({
    try: () => read.signals(webRequest),
    catch: (cause) => new InvalidSignalsError({ cause }),
  })

  return yield* Schema.decodeUnknownEffect(schema)(signals).pipe(
    Effect.mapError((cause) => new InvalidSignalsError({ cause })),
  )
})

export const datastarPage = (...args: Parameters<typeof reply.page>) =>
  HttpServerResponse.raw(reply.page(...args))

export const datastarPatch = (...args: Parameters<typeof reply.patch>) =>
  HttpServerResponse.raw(reply.patch(...args))

export const datastarSignals = (...args: Parameters<typeof reply.signals>) =>
  HttpServerResponse.raw(reply.signals(...args))

export const datastarStream = (...args: Parameters<typeof reply.stream>) =>
  HttpServerResponse.raw(reply.stream(...args))

export const datastarDone = (...args: Parameters<typeof reply.done>) =>
  HttpServerResponse.raw(reply.done(...args))
