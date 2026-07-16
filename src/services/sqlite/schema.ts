import { createSelectSchema } from "drizzle-orm/effect-schema"
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Schema } from "effect"

export const sqliteCounters = sqliteTable(
  "counters",
  {
    name: text("name").notNull(),
    value: integer("value").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.name] })],
)

export const sqliteCounterRowSchema = createSelectSchema(sqliteCounters, {
  name: (schema) => schema.check(Schema.isMinLength(1)),
  value: (schema) => schema.check(Schema.isGreaterThanOrEqualTo(0)),
})

export type SqliteCounterRow = Schema.Schema.Type<typeof sqliteCounterRowSchema>
