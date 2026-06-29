import { DurableObject } from "cloudflare:workers"
import { Effect } from "effect"
import { makePulseHub, type PulseHub } from "@/lib/realtime/pulse"

export class LiveRoom extends DurableObject<CloudflareBindings> {
  readonly #hub: PulseHub

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    this.#hub = makePulseHub()
  }

  subscribe(): ReadableStream<Uint8Array> {
    return this.#hub.subscribe()
  }

  publish(): Promise<void> {
    return Effect.runPromise(this.#hub.publish)
  }
}
