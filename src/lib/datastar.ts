import { Effect, Schema, Stream } from "effect"
import { event, read, reply } from "datastar-kit"
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
  HttpServerResponse.fromWeb(reply.page(...args))

export const datastarPatch = (...args: Parameters<typeof reply.patch>) =>
  HttpServerResponse.fromWeb(reply.patch(...args))

export const datastarSignals = (...args: Parameters<typeof reply.signals>) =>
  HttpServerResponse.fromWeb(reply.signals(...args))

export const datastarSignalsEffect = (...args: Parameters<typeof reply.signals>) =>
  Effect.succeed(datastarSignals(...args))

export const datastarStream = (...args: Parameters<typeof reply.stream>) =>
  HttpServerResponse.fromWeb(reply.stream(...args))

type DatastarStreamChunk = string | Uint8Array
const textEncoder = new TextEncoder()

export const datastarLiveStream = <E>(
  events: Stream.Stream<DatastarStreamChunk, E>,
  options?: Parameters<typeof reply.stream>[1],
  init?: Parameters<typeof reply.stream>[2],
) => {
  const intervalMs = options?.heartbeat?.intervalMs ?? 15_000
  const heartbeat = Stream.fromEffect(
    Effect.sleep(options?.heartbeat?.initialDelayMs ?? intervalMs).pipe(
      Effect.as(event.comment(options?.heartbeat?.comment ?? "heartbeat")),
    ),
  ).pipe(
    Stream.concat(
      Stream.fromEffectRepeat(
        Effect.sleep(intervalMs).pipe(
          Effect.as(event.comment(options?.heartbeat?.comment ?? "heartbeat")),
        ),
      ),
    ),
  )
  const body = events.pipe(
    options?.heartbeat === undefined
      ? (stream) => stream
      : Stream.merge(heartbeat, { haltStrategy: "left" }),
    Stream.map((chunk) => (typeof chunk === "string" ? textEncoder.encode(chunk) : chunk)),
  )
  const metadata = reply.stream([], options, init)

  return HttpServerResponse.stream(body, {
    status: metadata.status,
    statusText: metadata.statusText,
    headers: metadata.headers,
  })
}

export const datastarDone = (...args: Parameters<typeof reply.done>) =>
  HttpServerResponse.fromWeb(reply.done(...args))
