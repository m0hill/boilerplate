import { Context, Duration, Effect } from "effect"
import { HttpMiddleware, HttpServerRequest } from "effect/unstable/http"
import { RequestLog } from "./request-log.js"

const pathOf = (rawUrl: string): string => {
  try {
    return new URL(rawUrl).pathname
  } catch {
    return rawUrl
  }
}

const levelFor = (status: number): "Error" | "Warn" | "Info" =>
  status >= 500 ? "Error" : status >= 400 ? "Warn" : "Info"

export const wideEventLogger = HttpMiddleware.make((httpApp) =>
  Effect.withFiber((fiber) => {
    const request = Context.getUnsafe(fiber.context, HttpServerRequest.HttpServerRequest)
    const log = Context.getUnsafe(fiber.context, RequestLog)

    return Effect.gen(function* () {
      const [duration, exit] = yield* Effect.timed(Effect.exit(httpApp))
      const status = exit._tag === "Success" ? exit.value.status : 500

      yield* Effect.logWithLevel(levelFor(status))("http_request").pipe(
        Effect.annotateLogs({
          http: {
            method: request.method,
            path: pathOf(request.url),
            status,
            durationMs: Math.round(Duration.toMillis(duration)),
          },
          ...(yield* log.snapshot),
        }),
      )

      return yield* exit
    })
  }),
)
