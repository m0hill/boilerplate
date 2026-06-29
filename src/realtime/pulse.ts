import { Effect, PubSub, Stream } from "effect"

const PULSE = new Uint8Array([1])

export interface PulseHub {
  readonly subscribe: () => ReadableStream<Uint8Array>
  readonly publish: Effect.Effect<void>
}

export const makePulseHub = (): PulseHub => {
  const pubsub = Effect.runSync(PubSub.sliding<void>({ capacity: 1 }))
  return {
    subscribe: () =>
      Effect.runSync(
        Stream.fromPubSub(pubsub).pipe(
          Stream.map(() => PULSE),
          Stream.toReadableStreamEffect(),
        ),
      ),
    publish: PubSub.publish(pubsub, undefined).pipe(Effect.asVoid),
  }
}
