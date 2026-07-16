import { Context, Effect, Ref } from "effect"

type LogFields = Record<string, unknown>
type ActionFailure = {
  readonly reason: string
  readonly cause?: unknown
}
type ActionFailureFields = LogFields & ActionFailure
type ActionSuccessFields<A> = (value: A) => LogFields | undefined
type ActionOptions<A, E> = {
  readonly success?: ActionSuccessFields<A>
  readonly failure: (error: E) => ActionFailureFields | undefined
}
type DefaultActionOptions<A> = {
  readonly success?: ActionSuccessFields<A>
}

export class RequestLog extends Context.Service<
  RequestLog,
  {
    readonly annotate: (fields: LogFields) => Effect.Effect<void>
    readonly snapshot: Effect.Effect<LogFields>
  }
>()("boilerplate/lib/observability/RequestLog") {}

export const makeRequestLog = Effect.fn("RequestLog.make")(function* () {
  const ref = yield* Ref.make<LogFields>({})
  return RequestLog.of({
    annotate: (fields) => Ref.update(ref, (current) => ({ ...current, ...fields })),
    snapshot: Ref.get(ref),
  })
})

export const annotate = (fields: LogFields): Effect.Effect<void, never, RequestLog> =>
  Effect.flatMap(RequestLog, (log) => log.annotate(fields))

const defaultActionFailureFields = (error: unknown): ActionFailureFields | undefined => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("reason" in error) ||
    typeof error.reason !== "string"
  ) {
    return undefined
  }

  return { reason: error.reason, cause: "cause" in error ? error.cause : undefined }
}

export function annotateAction(
  feature: string,
  action: string,
): {
  <A, E extends ActionFailure, R>(
    effect: Effect.Effect<A, E, R>,
    successFields?: ActionSuccessFields<A>,
  ): Effect.Effect<A, E, R | RequestLog>
  <A, E extends ActionFailure, R>(
    effect: Effect.Effect<A, E, R>,
    options?: DefaultActionOptions<A>,
  ): Effect.Effect<A, E, R | RequestLog>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    options: ActionOptions<A, E>,
  ): Effect.Effect<A, E, R | RequestLog>
} {
  return <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    optionsOrSuccess?: ActionSuccessFields<A> | DefaultActionOptions<A> | ActionOptions<A, E>,
  ): Effect.Effect<A, E, R | RequestLog> => {
    const successFields =
      typeof optionsOrSuccess === "function" ? optionsOrSuccess : optionsOrSuccess?.success
    const failureFields =
      typeof optionsOrSuccess === "object" && "failure" in optionsOrSuccess
        ? optionsOrSuccess.failure
        : defaultActionFailureFields

    return effect.pipe(
      Effect.tap((value) =>
        annotate({ [feature]: { ...successFields?.(value), ok: true, action } }),
      ),
      Effect.tapError((error) => {
        const fields = failureFields(error)
        return fields === undefined
          ? Effect.void
          : annotate({
              [feature]: {
                ...fields,
                ok: false,
                action,
                reason: fields.reason,
                cause: fields.cause,
              },
            })
      }),
    )
  }
}
