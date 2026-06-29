import { DurableObject } from "cloudflare:workers"
import { Effect, PubSub, Stream } from "effect"

const PULSE = new Uint8Array([1])

export class LiveRoom extends DurableObject<CloudflareBindings> {
  readonly #invalidations: PubSub.PubSub<void>

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    this.#invalidations = Effect.runSync(PubSub.sliding<void>({ capacity: 1 }))
  }

  subscribe(): ReadableStream<Uint8Array> {
    const pulses = Stream.fromPubSub(this.#invalidations).pipe(Stream.map(() => PULSE))
    return Effect.runSync(pulses.pipe(Stream.toReadableStreamEffect()))
  }

  publish(): Promise<boolean> {
    return Effect.runPromise(PubSub.publish(this.#invalidations, undefined))
  }
}
