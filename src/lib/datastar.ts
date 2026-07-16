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

const makeCancellableIterable = (source: AsyncIterable<DatastarStreamChunk>) => {
  let iterator: AsyncIterator<DatastarStreamChunk> | undefined
  let cancelled = false
  let resolveCancellation = () => {}
  const cancellation = new Promise<IteratorResult<DatastarStreamChunk>>((resolve) => {
    resolveCancellation = () => resolve({ done: true, value: undefined })
  })

  const close = async () => {
    if (cancelled) return
    cancelled = true
    resolveCancellation()
    await iterator?.return?.()
  }

  const iterable: AsyncIterable<DatastarStreamChunk> = {
    [Symbol.asyncIterator]() {
      iterator = source[Symbol.asyncIterator]()
      return {
        next() {
          if (cancelled) return Promise.resolve({ done: true, value: undefined })
          const next = iterator?.next() ?? Promise.resolve({ done: true, value: undefined })
          return Promise.race([next, cancellation])
        },
        async return() {
          await close()
          return { done: true, value: undefined }
        },
      }
    },
  }

  return { iterable, close }
}

export const datastarLiveStream = (
  events: AsyncIterable<DatastarStreamChunk>,
  options?: Parameters<typeof reply.stream>[1],
  init?: Parameters<typeof reply.stream>[2],
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    if (!(request.source instanceof Request)) {
      // Node's writer owns Effect stream lifecycles. Keeping the body native here lets concurrent
      // long-lived responses remain independent and interrupts the event iterator on disconnect.
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
      const body = Stream.fromAsyncIterable(events, (cause) => cause).pipe(
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

    const cancellable = makeCancellableIterable(events)
    const response = reply.stream(cancellable.iterable, options, init)
    const responseBody = response.body
    if (responseBody === null) return HttpServerResponse.fromWeb(response)

    const reader = responseBody.getReader()
    // The Web handler must forward cancellation before a pending Datastar pull can settle.
    const body = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            const result = await reader.read()
            if (result.done) controller.close()
            else controller.enqueue(result.value)
          } catch (cause) {
            controller.error(cause)
          }
        },
        async cancel() {
          await cancellable.close()
          await reader.cancel().catch(() => {})
        },
      },
      { highWaterMark: 0 },
    )
    return HttpServerResponse.raw(
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
    )
  })

export const datastarDone = (...args: Parameters<typeof reply.done>) =>
  HttpServerResponse.fromWeb(reply.done(...args))
