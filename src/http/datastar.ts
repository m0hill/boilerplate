import { Data, Effect, Schema } from "effect"
import { read } from "datastar-kit"
import { HttpServerRequest } from "effect/unstable/http"

/** Datastar signals could not be read from the request or decoded by the route schema. */
export class InvalidSignalsError extends Data.TaggedError("InvalidSignalsError")<{
  readonly cause: unknown
}> {}

/** Reads Datastar signals from an Effect HTTP request and decodes them with the route schema. */
export const decodeSignals = <S extends Schema.Top>(
  request: HttpServerRequest.HttpServerRequest,
  schema: S,
): Effect.Effect<S["Type"], InvalidSignalsError, S["DecodingServices"]> =>
  HttpServerRequest.toWeb(request).pipe(
    Effect.mapError((cause) => new InvalidSignalsError({ cause })),
    Effect.flatMap((webRequest) =>
      Effect.tryPromise({
        try: () => read.signals(webRequest),
        catch: (cause) => new InvalidSignalsError({ cause }),
      }),
    ),
    Effect.flatMap((signals) =>
      Schema.decodeUnknownEffect(schema)(signals).pipe(
        Effect.mapError((cause) => new InvalidSignalsError({ cause })),
      ),
    ),
  )
