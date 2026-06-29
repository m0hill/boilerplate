import { Context, Effect, Ref } from "effect"

export type LogFields = Record<string, unknown>

export class RequestLog extends Context.Service<
  RequestLog,
  {
    readonly annotate: (fields: LogFields) => Effect.Effect<void>
    readonly snapshot: Effect.Effect<LogFields>
  }
>()("boilerplate/observability/RequestLog") {}

export const makeRequestLog = (): RequestLog["Service"] => {
  const ref = Effect.runSync(Ref.make<LogFields>({}))
  return RequestLog.of({
    annotate: (fields) => Ref.update(ref, (current) => ({ ...current, ...fields })),
    snapshot: Ref.get(ref),
  })
}

export const annotate = (fields: LogFields): Effect.Effect<void, never, RequestLog> =>
  Effect.flatMap(RequestLog, (log) => log.annotate(fields))
