import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Schema } from "effect"

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
})

export const roomSchema = { messages }

export const messageRowSchema = Schema.Struct({
  id: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  author: Schema.NonEmptyString,
  body: Schema.NonEmptyString,
  createdAt: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
})
