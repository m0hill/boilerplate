# Code quality guide

Follow nearby code first. These rules cover project-specific boundaries that are easy to miss.

## Runtime boundaries

- App code runs on Cloudflare Workers. Keep Node-only APIs out of Worker modules.
- `src/client` is browser-only. It must not import Worker routes, page modules, Cloudflare
  bindings, persistence adapters, or server capabilities.
- Bindings enter through `src/index.tsx`. Adapt them into narrow services before passing them to
  page/domain code unless a feature truly needs the raw Worker env.

## TypeScript and domain rules

- Keep strict TypeScript clean: no `any`, no non-null assertions, no `as Type` casts. Prefer
  parsing, narrowing, and derived types. `as const` is fine.
- Parse untrusted data once at the boundary: Datastar signals, params, request bodies, external
  JSON, env/config, and Worker bindings.
- Keep parsed domain values inside the service or page that owns the behavior. Do not pass raw DTOs,
  `unknown`, or `Partial<T>` through core logic.
- Expected failures should be typed values in the Effect error channel. Throw/reject only for
  defects or startup misconfiguration.
- Derive shapes from schemas, services, or existing values where practical instead of duplicating
  interfaces.

## Module shape

- Keep MPA page code under `src/pages/<name>/`: routes/handlers and page-owned Datastar state in
  `index.tsx`, page-local TSX in `components/`, and page tests in `tests/`.
- Put Cloudflare resource-bound capabilities, domain parsers, persistence adapters, Durable Objects,
  and resource schemas under `src/resources/<resource>/`.
- Put non-Cloudflare external services and app capabilities under `src/services/<service>/`.
- Put app glue under specifically named `src/lib/` modules (`datastar.ts`, `observability/`,
  `realtime/`).
- Name files after what they do (`counter.ts`, `r2-objects.ts`, `github-repos.ts`, `chat-rooms.ts`).
  Keep D1 schema files in `src/resources/d1/`; keep Durable Object SQLite schema files with the DO
  resource that owns them, e.g. `src/resources/chat-room/schema.ts`.
- Page components should use simple names (`page.tsx`, `form.tsx`, `count.tsx`, `message-list.tsx`).
- Split a file when separate concepts grow enough to benefit from their own names.
- Export the API other modules need.
- Keep I/O, parsing, time/randomness, telemetry, and framework glue at the boundary; keep domain
  rules pure where possible.
