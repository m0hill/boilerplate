import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { Effect, PubSub, Stream } from "effect"
import { reply } from "datastar-kit"
import migrations from "../../../drizzle-do/migrations"
import { type Message, makeRoom } from "./room.js"
import { roomSchema } from "./schema.js"

export class ChatRoom extends DurableObject<CloudflareBindings> {
  readonly #room: ReturnType<typeof makeRoom>
  readonly #events: PubSub.PubSub<string>

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    const db = drizzle(ctx.storage, { schema: roomSchema })
    this.#room = makeRoom(db)
    this.#events = Effect.runSync(PubSub.unbounded<string>())

    void ctx.blockConcurrencyWhile(async () => {
      migrate(db, migrations)
    })
  }

  list(): Promise<readonly Message[]> {
    return Effect.runPromise(this.#room.list)
  }

  post(author: string, body: string): Promise<readonly Message[]> {
    return Effect.runPromise(this.#room.post(author, body))
  }

  /**
   * Opens a long-lived SSE stream, seeded with `initialEvents`, that then replays every `publish`.
   * The stream subscribes to the room's PubSub and unsubscribes automatically when the connection
   * closes (its scope is finalized by `reply.stream` on disconnect).
   */
  subscribe(initialEvents: string): Response {
    const events = Stream.succeed(initialEvents).pipe(
      Stream.concat(Stream.fromPubSub(this.#events)),
    )

    return reply.stream(Stream.toAsyncIterable(events), {
      heartbeat: { intervalMs: 15_000, comment: "do-room" },
    })
  }

  /** Fans `events` out to every open subscriber; resolves to whether the event was accepted. */
  publish(events: string): Promise<boolean> {
    return Effect.runPromise(PubSub.publish(this.#events, events))
  }
}
