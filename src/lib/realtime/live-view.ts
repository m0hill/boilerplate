import { Cause, Effect, Stream } from "effect"
import type { HttpServerResponse } from "effect/unstable/http"
import { datastarStream } from "../datastar.js"

interface LiveViewOptions<E, R = never> {
  readonly pulses: ReadableStream<Uint8Array>
  readonly render: Effect.Effect<string, E, R>
  readonly log: Record<string, unknown>
}

export const liveView = <E, R = never>(
  options: LiveViewOptions<E, R>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
  Effect.gen(function* () {
    const startedAt = Date.now()

    const events = Stream.fromEffect(options.render).pipe(
      Stream.concat(
        Stream.fromReadableStream({
          evaluate: () => options.pulses,
          onError: (cause) => cause,
        }).pipe(Stream.mapEffect(() => options.render)),
      ),
      Stream.changes,
      Stream.catchCause((cause) =>
        Stream.fromEffect(
          Effect.logError("live_stream_error").pipe(
            Effect.annotateLogs({
              live: { ...options.log, event: "error" },
              cause: Cause.pretty(cause),
            }),
          ),
        ).pipe(Stream.drain),
      ),
      Stream.ensuring(
        Effect.logInfo("live_stream_closed").pipe(
          Effect.annotateLogs({
            live: { ...options.log, event: "closed", durationMs: Date.now() - startedAt },
          }),
        ),
      ),
    )

    const iterable = yield* Stream.toAsyncIterableEffect(events)
    return datastarStream(iterable, { heartbeat: { intervalMs: 15_000, comment: "live" } })
  })
