# Code Quality

## Runtime

- Server application code targets Node 24 ESM.
- `src/client` is browser-only and imports browser-safe modules only.
- Node filesystem, HTTP, process, and SQLite APIs stay at explicit server or script boundaries.
- Environment configuration enters through `ServerConfig`, not scattered `process.env` reads.
- Database clients stay behind typed persistence services.

## Effect-owned Code

- Routes, handlers, services, schemas, failures, configuration, and resource wiring use Effect.
- Pure sync helpers with no dependencies or expected failures stay plain TypeScript.
- Browser-only `src/client` stays plain browser TypeScript.
- Expected failures stay in the Effect error channel.
- Read `effect.md` before touching Effect-owned files.

## Types

- Parse Datastar signals, params, bodies, external JSON, environment configuration, and stored rows.
- Keep parsed domain values inside the owner module.
- Use explicit branches for nullable values.
- Derive types from schemas, services, or existing values.
- Use `as const` only for literal preservation.
- Avoid `any`, non-null assertions, and `as Type`.
- Throw or reject only for defects and startup misconfiguration.

## Modules

- Keep page routes and handlers under `src/pages/<name>/`.
- Keep page TSX in `components/` and page tests in `tests/`.
- Put SQLite lifecycle, schema, and queries under `src/services/sqlite/`.
- Put other capabilities under `src/services/<service>/`.
- Put shared application glue in named `src/lib/` modules.
- Name files after what they do.
- Export only the API other modules need.
- Keep ordering, cleanup, persistence, and error mapping behind small cohesive APIs.
- Avoid pass-through modules and hypothetical adapter seams.
- Keep I/O, parsing, time, randomness, telemetry, and framework glue at boundaries.
