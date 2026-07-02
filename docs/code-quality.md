# Code Quality

## Runtime

- Worker modules use Web and Cloudflare runtime APIs.
- Node APIs are allowed in `scripts/` and tests.
- `src/client` is browser-only.
- `src/client` imports browser-safe modules only.
- Bindings enter through `src/index.tsx`.
- Adapt bindings into narrow services before page or domain code uses them.

## Types

- Use parsed and narrowed types.
- Use explicit branches for nullable values.
- Use schema-derived or service-derived types.
- Use parsing, branching, narrowing, and derived types.
- `as const` is fine.
- Parse Datastar signals, params, bodies, external JSON, env, config, and Worker bindings.
- Keep parsed domain values inside the owner module.
- Pass parsed domain values through core logic.
- Expected failures are typed values.
- Throw or reject only for defects and startup misconfiguration.
- Derive types from schemas, services, or existing values.

## Modules

- Keep page routes and handlers under `src/pages/<name>/`.
- Keep page-owned Datastar state with the page.
- Put page TSX in `src/pages/<name>/components/`.
- Put page tests in `src/pages/<name>/tests/`.
- Put Cloudflare resource code in `src/resources/<resource>/`.
- Put D1 schema in `src/resources/d1/`.
- Put DO SQLite schema with its DO resource.
- Put external services in `src/services/<service>/`.
- Put shared app glue in named `src/lib/` modules.
- Name files after what they do: `counter.ts`, `r2-objects.ts`, `github-repos.ts`.
- Use simple component names: `page.tsx`, `form.tsx`, `count.tsx`, `message-list.tsx`.
- Split files when separate concepts need names.
- Export only the API other modules need.
- Deep modules hide ordering, rollback, serialization, and persistence behind a small API.
- Deep feature services hide workflows behind one API.
- Pages depend on workflow APIs, not service bags.
- Use the deletion test: if deleting a module spreads complexity across callers, it is earning its keep.
- Avoid pass-through modules that only rename another API.
- Treat a seam as real once two adapters exist; one adapter is hypothetical.
- Prefer boring domain operations over generic mutation/outcome wrappers.
- Keep I/O, parsing, time, randomness, telemetry, and framework glue at boundaries.
- Keep domain rules pure when practical.
