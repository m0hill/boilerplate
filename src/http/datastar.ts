import { Effect, Schema } from "effect"
import { read, reply } from "datastar-kit"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

/** Datastar signals could not be read from the request or decoded by the route schema. */
export class InvalidSignalsError extends Schema.TaggedErrorClass<InvalidSignalsError>()(
  "InvalidSignalsError",
  {
    cause: Schema.Defect(),
  },
) {}

/** Reads Datastar signals from an Effect HTTP request and decodes them with the route schema. */
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

/** Returns a full Datastar HTML document as an Effect HTTP response. */
export const datastarPage = (...args: Parameters<typeof reply.page>) =>
  HttpServerResponse.raw(reply.page(...args))

/** Returns a Datastar element patch as an Effect HTTP response. */
export const datastarPatch = (...args: Parameters<typeof reply.patch>) =>
  HttpServerResponse.raw(reply.patch(...args))

/** Returns a Datastar signal patch as an Effect HTTP response. */
export const datastarSignals = (...args: Parameters<typeof reply.signals>) =>
  HttpServerResponse.raw(reply.signals(...args))

/** Returns a Datastar SSE stream as an Effect HTTP response. */
export const datastarStream = (...args: Parameters<typeof reply.stream>) =>
  HttpServerResponse.raw(reply.stream(...args))
