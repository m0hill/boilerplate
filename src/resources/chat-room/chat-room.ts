import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { Effect } from "effect"
import migrations from "@/migrations/drizzle-do/migrations"
import { makePulseHub, type PulseHub } from "@/lib/realtime/pulse"
import { type Message, makeRoom } from "@/resources/chat-room/room"

export class ChatRoom extends DurableObject<unknown> {
  readonly #room: ReturnType<typeof makeRoom>
  readonly #hub: PulseHub

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    const db = drizzle(ctx.storage)
    this.#room = makeRoom(db)
    this.#hub = makePulseHub()

    void ctx.blockConcurrencyWhile(async () => {
      migrate(db, migrations)
    })
  }

  list(): Promise<readonly Message[]> {
    return Effect.runPromise(this.#room.list)
  }

  post(author: string, body: string): Promise<void> {
    return Effect.runPromise(this.#room.post(author, body).pipe(Effect.andThen(this.#hub.publish)))
  }

  subscribe(): ReadableStream<Uint8Array> {
    return this.#hub.subscribe()
  }
}
