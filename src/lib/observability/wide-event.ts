import { Duration, Effect, Exit, Option } from "effect"
import { HttpMiddleware, HttpServerRequest } from "effect/unstable/http"
import { RequestLog } from "@/lib/observability/request-log"

const pathOf = (request: HttpServerRequest.HttpServerRequest): string =>
  Option.match(HttpServerRequest.toURL(request), {
    onNone: () => request.url,
    onSome: (url) => url.pathname,
  })

const levelFor = (status: number): "Error" | "Warn" | "Info" =>
  status >= 500 ? "Error" : status >= 400 ? "Warn" : "Info"

export const wideEventLogger = HttpMiddleware.make((httpApp) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const log = yield* RequestLog
    const [duration, exit] = yield* Effect.timed(Effect.exit(httpApp))
    const status = Exit.match(exit, {
      onFailure: () => 500,
      onSuccess: (response) => response.status,
    })

    yield* Effect.logWithLevel(levelFor(status))("http_request").pipe(
      Effect.annotateLogs({
        http: {
          method: request.method,
          path: pathOf(request),
          status,
          durationMs: Math.round(Duration.toMillis(duration)),
        },
        ...(yield* log.snapshot),
      }),
    )

    return yield* exit
  }),
)
