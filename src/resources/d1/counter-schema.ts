import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Schema } from "effect"

const CounterValue = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

export const d1Counters = sqliteTable(
  "d1_counters",
  {
    name: text("name").notNull(),
    value: integer("value").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.name] })],
)

export const d1CounterRowSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  value: CounterValue,
})
