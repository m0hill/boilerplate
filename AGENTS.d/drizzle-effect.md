# Drizzle + Effect guide

Use these patterns for Drizzle, Cloudflare SQLite resources, and Effect Schema.

## Which Drizzle Effect APIs apply here

- This project uses `drizzle-orm@1.0.0-rc.4` with `effect@4.0.0-beta.x`.
- Use `drizzle-orm/effect-schema` to derive Effect schemas from Drizzle table/view definitions.
  `1.0.0-rc.2` is not Worker-safe for this import because it touches global `Buffer` at module
  load; keep Drizzle and Drizzle Kit on `rc.4` or newer before using this package in Worker code.
- Do **not** use `drizzle-orm/effect-postgres` for D1 or Durable Object SQLite. It is only for
  PostgreSQL through `@effect/sql-pg`, where query builders are yielded directly as Effects.
- Drizzle's old GitHub `effect` / `effect2` branches are prototype/version branches. Prefer the API
  shipped in the installed package and documented under `orm.drizzle.team/docs/*/effect-schema`.
- `drizzle-orm/effect-d1` and `drizzle-orm/effect-sqlite-do` exist in `rc.4`, but require the
  matching `@effect/sql-*` clients and Layer wiring. Do not mix them into one feature casually; if we
  adopt them, convert the whole resource seam to Effect SQL layers rather than wrapping an Effect SQL
  client inside every query.

## Derive schemas from tables

- For selected database rows, use `createSelectSchema(table, refinements)` instead of hand-writing a
  duplicate `Schema.Struct` with the same columns.
- Put domain refinements in the second argument, e.g. minimum lengths and non-negative counters:

```ts
import { createSelectSchema } from "drizzle-orm/effect-schema"
import { Schema } from "effect"

export const rowSchema = createSelectSchema(table, {
  name: (schema) => schema.check(Schema.isMinLength(1)),
  value: (schema) => schema.check(Schema.isGreaterThanOrEqualTo(0)),
})
```

- Use `createInsertSchema` / `createUpdateSchema` only for table-shaped input boundaries. Do not
  couple page/domain form parsing to DB insert schemas when the service owns fields such as IDs,
  timestamps, or derived values.
- Derive row types from the schema when exported types are needed:

```ts
export type Row = Schema.Schema.Type<typeof rowSchema>
```

## Effect execution around Cloudflare SQLite

- With Drizzle `rc.4`, D1 and Durable Object SQLite constructors do not take the old `{ schema }`
  option. Call `drizzle(env.APP_DB)` and `drizzle(ctx.storage)`, then import tables directly in the
  resource that queries them.
- D1 query builders are promise-like; wrap execution with `Effect.tryPromise` and map failures to a
  feature-specific tagged error.
- Durable Object SQLite (`drizzle-orm/durable-sqlite`) is synchronous; wrap `.all()` / `.run()` with
  `Effect.try`.
- Decode rows at the database boundary with `Schema.decodeUnknownEffect(rowSchema)`. Map decode
  failures to an `invalid_row` tagged error and only pass decoded values inward.
- Keep migrations in Drizzle/Alchemy flow; Effect Schema does not replace migrations or Drizzle table
  definitions.
- Drizzle Kit schema entry files must export the actual tables at top level. Do not add pass-through
  files or grouped `{ table }` exports solely for Drizzle Kit; put the table and its derived Effect
  row schemas in the schema entry file and import tables directly where queries need them.
