import { DurableObject } from "cloudflare:workers"
import { Effect, PubSub, Stream } from "effect"
import { reply } from "datastar-kit"

export class LiveRoom extends DurableObject<CloudflareBindings> {
  readonly #events: PubSub.PubSub<string>

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    this.#events = Effect.runSync(PubSub.unbounded<string>())
  }

  subscribe(initialEvents: string): Response {
    const events = Stream.succeed(initialEvents).pipe(
      Stream.concat(Stream.fromPubSub(this.#events)),
    )

    return reply.stream(Stream.toAsyncIterable(events), {
      heartbeat: { intervalMs: 15_000, comment: "live-room" },
    })
  }

  publish(events: string): Promise<boolean> {
    return Effect.runPromise(PubSub.publish(this.#events, events))
  }
}
