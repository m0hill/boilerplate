# Code Quality

## Runtime

- Worker modules cannot use Node APIs.
- Node APIs are allowed in `scripts/` and tests.
- `src/client` is browser-only.
- `src/client` must not import Worker routes, page modules, bindings, persistence adapters, or server services.
- Bindings enter through `src/index.tsx`.
- Adapt bindings into narrow services before page or domain code uses them.
- Pass raw Worker env only when a feature truly needs it.

## Types

- Avoid `any`.
- Avoid non-null assertions.
- Avoid `as Type`.
- Use parsing, branching, narrowing, and derived types.
- `as const` is fine.
- Parse Datastar signals, params, bodies, external JSON, env, config, and Worker bindings.
- Keep parsed domain values inside the owner module.
- Do not pass raw DTOs, `unknown`, or `Partial<T>` through core logic.
- Expected failures are typed values.
- Throw or reject only for defects and startup misconfiguration.
- Derive types from schemas, services, or existing values.
- Do not duplicate interfaces when a source shape exists.
- Use root `@/` imports for internal modules.
- Omit `.js` extensions.

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
- Keep I/O, parsing, time, randomness, telemetry, and framework glue at boundaries.
- Keep domain rules pure when practical.
