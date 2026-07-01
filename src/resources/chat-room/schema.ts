import { createSelectSchema } from "drizzle-orm/effect-schema"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Schema } from "effect"
import { MessageAuthorSchema, MessageBodySchema } from "@/resources/chat-room/rooms"

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
})

export const roomSchema = { messages }

export const messageRowSchema = createSelectSchema(messages, {
  id: (schema) => schema.check(Schema.isGreaterThanOrEqualTo(1)),
  author: () => MessageAuthorSchema,
  body: () => MessageBodySchema,
  createdAt: (schema) => schema.check(Schema.isGreaterThanOrEqualTo(0)),
})
