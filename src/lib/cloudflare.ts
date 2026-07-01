import { Cause, Context, Effect } from "effect"

type WaitUntilContext = Pick<ExecutionContext, "waitUntil">

const runBackground = <A, E>(effect: Effect.Effect<A, E>): Promise<void> =>
  Effect.runPromise(
    effect.pipe(
      Effect.asVoid,
      Effect.catchCause((cause) =>
        Effect.logError("wait_until_task_failed").pipe(
          Effect.annotateLogs({ cause: Cause.pretty(cause) }),
        ),
      ),
    ),
  )

export class CloudflareContext extends Context.Service<
  CloudflareContext,
  {
    readonly waitUntil: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<void>
  }
>()("boilerplate/lib/CloudflareContext") {}

export const makeCloudflareContext = (ctx?: WaitUntilContext): CloudflareContext["Service"] =>
  CloudflareContext.of({
    waitUntil: (effect) => {
      if (ctx === undefined) {
        return Effect.promise(() => runBackground(effect))
      }

      return Effect.sync(() => {
        ctx.waitUntil(runBackground(effect))
      })
    },
  })

export const waitUntil = <A, E>(
  effect: Effect.Effect<A, E>,
): Effect.Effect<void, never, CloudflareContext> =>
  Effect.flatMap(CloudflareContext, (context) => context.waitUntil(effect))
