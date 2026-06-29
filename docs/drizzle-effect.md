# Drizzle + Effect

## APIs

- Project uses `drizzle-orm@1.0.0-rc.4` with `effect@4.0.0-beta.x`.
- Use `drizzle-orm/effect-schema` for schemas from tables.
- Keep Drizzle and Drizzle Kit on `rc.4` or newer.
- `rc.2` touches global `Buffer` at module load.
- `rc.2` is not Worker-safe for `drizzle-orm/effect-schema`.
- Do not use `drizzle-orm/effect-postgres` for D1 or DO SQLite.
- It is only for PostgreSQL through `@effect/sql-pg`.
- Old Drizzle GitHub `effect` branches are prototypes.
- Prefer APIs shipped in the installed package.
- Do not casually mix `effect-d1` or `effect-sqlite-do` into one resource.
- They require matching `@effect/sql-*` clients and Layer wiring.
- If adopting Effect SQL, convert the whole resource seam to its Layers.

## Schemas

- Use `createSelectSchema(table, refinements)` for selected rows.
- Do not hand-write duplicate `Schema.Struct` row schemas.
- Put domain refinements in the second argument.
- Typical refinements: minimum text length, non-negative counters.
- Use `createInsertSchema` and `createUpdateSchema` only for table-shaped input.
- Do not parse page forms with insert schemas when services own fields.
- Derive exported row types from schemas.

```ts
export type Row = Schema.Schema.Type<typeof rowSchema>
```

## Queries

- D1 and DO SQLite constructors do not take `{ schema }`.
- Use `drizzle(env.APP_DB)` for D1.
- Use `drizzle(ctx.storage)` for DO SQLite.
- Import tables directly in query modules.
- D1 query builders are promise-like.
- Wrap D1 execution with `Effect.tryPromise`.
- `drizzle-orm/durable-sqlite` is synchronous.
- Wrap DO SQLite `.all()` and `.run()` with `Effect.try`.
- Map storage failures to feature-specific tagged errors.
- Decode rows at the database boundary.
- Use `Schema.decodeUnknownEffect(rowSchema)`.
- Map decode failures to `invalid_row`.
- Pass only decoded values inward.

## Migrations

- Effect Schema does not replace migrations.
- Drizzle table definitions stay migration source of truth.
- Alchemy applies D1 migrations.
- DO SQLite migrations run inside the DO.
- Drizzle Kit schema entries export actual tables at top level.
- Do not create pass-through schema files only for Drizzle Kit.
- Do not export grouped `{ table }` objects for Drizzle Kit.
