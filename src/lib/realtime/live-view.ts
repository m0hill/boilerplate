import { event, type HtmlChild } from "datastar-kit"
import { Cause, Clock, Effect, Stream } from "effect"
import type { HttpServerResponse } from "effect/unstable/http"
import { datastarStream } from "@/lib/datastar"

interface LiveViewOptions<SubscribeError, RenderError, SubscribeR = never, RenderR = never> {
  readonly subscribe: Effect.Effect<ReadableStream<Uint8Array>, SubscribeError, SubscribeR>
  readonly render: Effect.Effect<string, RenderError, RenderR>
  readonly log: Record<string, unknown>
}

interface LiveRegionOptions<Value, SubscribeError, ReadError, SubscribeR = never, ReadR = never> {
  readonly subscribe: Effect.Effect<ReadableStream<Uint8Array>, SubscribeError, SubscribeR>
  readonly read: Effect.Effect<Value, ReadError, ReadR>
  readonly render: (value: Value) => HtmlChild
  readonly log: Record<string, unknown>
}

export const liveView = <SubscribeError, RenderError, SubscribeR = never, RenderR = never>(
  options: LiveViewOptions<SubscribeError, RenderError, SubscribeR, RenderR>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, SubscribeError, SubscribeR | RenderR> =>
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    const pulses = yield* options.subscribe

    const events = Stream.fromEffect(options.render).pipe(
      Stream.concat(
        Stream.fromReadableStream({
          evaluate: () => pulses,
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
        Effect.gen(function* () {
          const endedAt = yield* Clock.currentTimeMillis
          yield* Effect.logInfo("live_stream_closed").pipe(
            Effect.annotateLogs({
              live: { ...options.log, event: "closed", durationMs: endedAt - startedAt },
            }),
          )
        }),
      ),
    )

    const iterable = yield* Stream.toAsyncIterableEffect(events)
    return datastarStream(iterable, { heartbeat: { intervalMs: 15_000, comment: "live" } })
  })

export const liveRegion = <Value, SubscribeError, ReadError, SubscribeR = never, ReadR = never>(
  options: LiveRegionOptions<Value, SubscribeError, ReadError, SubscribeR, ReadR>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, SubscribeError, SubscribeR | ReadR> =>
  liveView({
    subscribe: options.subscribe,
    render: options.read.pipe(Effect.map((value) => event.patch(options.render(value)))),
    log: options.log,
  })
