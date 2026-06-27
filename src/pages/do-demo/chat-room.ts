import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { Effect } from "effect"
import migrations from "../../../drizzle-do/migrations"
import { type Message, makeRoom } from "./room.js"
import { roomSchema } from "./schema.js"

export class ChatRoom extends DurableObject<CloudflareBindings> {
  readonly #room: ReturnType<typeof makeRoom>

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    const db = drizzle(ctx.storage, { schema: roomSchema })
    this.#room = makeRoom(db)

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
}
