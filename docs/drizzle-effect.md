# Drizzle + Effect

## Driver And Lifecycle

- Use Node's built-in `DatabaseSync` from `node:sqlite`.
- Use `drizzle-orm/node-sqlite`; do not add a native SQLite addon.
- Acquire and close the connection through the scoped `SqliteDatabase` Layer.
- Keep raw database access inside persistence services.
- Treat synchronous queries as short operations because they block the Node event loop.

## Schemas

- Keep table definitions in `src/services/sqlite/schema.ts` as the migration source of truth.
- Use `drizzle-orm/effect-schema` for schemas derived from tables.
- Use `createSelectSchema(table, refinements)` for selected rows.
- Put domain refinements in the second argument.
- Derive exported row types from schemas.
- Decode rows at the database boundary with `Schema.decodeUnknownEffect`.
- Map decode failures to the persistence service's `invalid_row` error.

## Queries

- Import tables directly in query modules.
- Wrap synchronous `node:sqlite` and Drizzle execution with `Effect.try`.
- Map read and write failures to feature-specific tagged errors.
- Return only decoded values from persistence services.
- Keep route handlers dependent on service operations instead of database clients.

## Migrations

- Generate migrations with `nub run db:generate`.
- Store generated migrations under `migrations/sqlite/`.
- Apply migrations explicitly with `nub run db:migrate`.
- Migration tooling and the server load the same Effect configuration.
- Server startup validates the exact local migration set and never mutates the schema.
- A missing or outdated schema must instruct the operator to run `nub run db:migrate`.
- Database tooling creates the parent directory for file-backed databases.
- Tests and Playwright use isolated temporary database paths.
