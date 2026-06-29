# Drizzle + Effect

## Schemas

- Use `drizzle-orm/effect-schema` for schemas from tables.
- Use `createSelectSchema(table, refinements)` for selected rows.
- Put domain refinements in the second argument.
- Typical refinements: minimum text length, non-negative counters.
- Use `createInsertSchema` and `createUpdateSchema` for table-shaped input.
- Use page/service schemas when services own IDs, timestamps, or derived fields.
- Derive exported row types from schemas.

```ts
export type Row = Schema.Schema.Type<typeof rowSchema>
```

## Queries

- Use `drizzle(env.APP_DB)` for D1.
- Use `drizzle(ctx.storage)` for DO SQLite.
- Import tables directly in query modules.
- Wrap D1 execution with `Effect.tryPromise`.
- Wrap DO SQLite `.all()` and `.run()` with `Effect.try`.
- Map storage failures to feature-specific tagged errors.
- Decode rows at the database boundary.
- Use `Schema.decodeUnknownEffect(rowSchema)`.
- Map decode failures to `invalid_row`.
- Pass only decoded values inward.

## Migrations

- Drizzle table definitions are migration source of truth.
- Effect Schema validates data.
- Alchemy applies D1 migrations.
- DO SQLite migrations run inside the DO.
- Drizzle Kit schema entries export actual tables at top level.
