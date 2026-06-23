import { Effect, Schema } from "effect"
import { read } from "datastar-kit"
import { HttpServerRequest } from "effect/unstable/http"

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
