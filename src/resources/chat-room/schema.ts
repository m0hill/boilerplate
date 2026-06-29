import { createSelectSchema } from "drizzle-orm/effect-schema"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Schema } from "effect"

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
})

export const roomSchema = { messages }

export const messageRowSchema = createSelectSchema(messages, {
  id: (schema) => schema.check(Schema.isGreaterThanOrEqualTo(1)),
  author: (schema) => schema.check(Schema.isMinLength(1)),
  body: (schema) => schema.check(Schema.isMinLength(1)),
  createdAt: (schema) => schema.check(Schema.isGreaterThanOrEqualTo(0)),
})
