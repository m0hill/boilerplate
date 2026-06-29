import { desc } from "drizzle-orm"
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite"
import { Effect, Schema } from "effect"
import { messageRowSchema, messages } from "@/resources/chat-room/schema"

const maxMessages = 50

export type Message = Schema.Schema.Type<typeof messageRowSchema>

type RoomDatabase = DrizzleSqliteDODatabase

export class RoomError extends Schema.TaggedErrorClass<RoomError>()("RoomError", {
  reason: Schema.Literals(["read_failed", "write_failed", "invalid_row"]),
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

const decodeRow = (row: unknown): Effect.Effect<Message, RoomError> =>
  Schema.decodeUnknownEffect(messageRowSchema)(row).pipe(
    Effect.mapError((cause) => new RoomError({ reason: "invalid_row", cause })),
  )

export function makeRoom(db: RoomDatabase) {
  const list = Effect.gen(function* () {
    const rows = yield* Effect.try({
      try: () => db.select().from(messages).orderBy(desc(messages.id)).limit(maxMessages).all(),
      catch: (cause) => new RoomError({ reason: "read_failed", cause }),
    })

    const decoded = yield* Effect.forEach(rows, decodeRow)
    return decoded.reverse()
  }).pipe(Effect.withSpan("Room.list"))

  const post = (author: string, body: string) =>
    Effect.try({
      try: () => db.insert(messages).values({ author, body, createdAt: Date.now() }).run(),
      catch: (cause) => new RoomError({ reason: "write_failed", cause }),
    }).pipe(Effect.asVoid, Effect.withSpan("Room.post"))

  return { list, post } as const
}
