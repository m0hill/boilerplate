# Project guide

## Stack

- **Runtime:** Cloudflare Workers via `wrangler`. `src/index.tsx` exports the Worker `fetch`
  handler built from Effect's `HttpRouter`.
- **Toolchain:** `nub` for installs, scripts, package execution, and Node version management. Node
  is the build/dev toolchain, not the app runtime.
- **HTTP/UI:** Effect `HttpRouter` + server-rendered TSX through `datastar-kit`. Datastar responses
  pass through helpers in `src/lib/datastar.ts`.
- **Validation:** Effect `Schema` at input and external JSON boundaries. Expected failures use
  tagged errors.
- **Assets:** static files are served from the `assets` binding in `wrangler.jsonc`; Tailwind builds
  `src/styles.css` to `public/app.css`.
- **Browser-only logic:** when Datastar attributes are not enough, the main path is a **web
  component** in `src/client/<name>.ts` (bundled to `public/js/<name>.js` by esbuild). Datastar
  keeps ownership of the inputs and state and feeds the element through `data-attr` (in) /
  `data-on` (out); the custom element holds only the irreducible client logic. `/web-component`
  (the `<qr-code>` element) is the canonical example.
- **Tests:** Vitest uses `@cloudflare/vitest-pool-workers`; Playwright e2e runs against
  `wrangler dev` and is separate from `nub run check`.

## Persistence and state

- **Prefer Durable Objects by default.** Reach for a DO first for anything stateful, and prefer the
  DO-owns-its-database shape: the object embeds its own SQLite (Drizzle on `durable-sqlite`,
  migrated in the constructor) and holds the logic that reads and writes it. One object serializes
  its own writes, so state is strongly consistent with no read-modify-write races — correctness
  without coordinating an external store. `src/resources/chat-room/` (per-room chat) is the canonical
  example.
- Scope each DO to a consistency/ownership boundary and address it by name via
  `NAMESPACE.idFromName(name)` (e.g. `room:<id>`, `user:<id>`, `doc:<id>`): per room, document, user,
  session, or workspace. Many named instances of one class, never one global object for the whole app.
- Keep the DO the source of truth for its boundary. Expose narrow RPC methods that return parsed
  domain values, run Effect programs inside via `Effect.runPromise`/`runSync` at the method seam,
  and adapt the namespace into a narrow worker-side service before page code uses it
  (`src/resources/chat-room/chat-rooms.ts`).
- Reach for D1 only when the data is genuinely global/relational and queried across many entities at
  once (cross-entity reports, admin lists, a single SQL query over everything). When D1 is the truth
  but you still want live updates, keep the DO as a payload-free invalidation hub and have each
  stream reload D1 — `src/pages/live-counter/` plus `src/resources/live-rooms/` is that pattern. Use
  KV only for cheap, eventually-consistent global key/value reads where races are acceptable.
- For realtime, use the same invalidation + re-read shape regardless of where the data lives:
  subscribe to a payload-free pulse stream **before** the first read, render current state as the
  first event, then re-read and render current state again on each pulse. Commands mutate the source
  of truth and publish a pulse; they should not also render the same live region. If the command only
  needs to acknowledge success, return `datastarDone()`; if it needs form cleanup, patch signals only.
- Durable Objects can still own everything. In the DO-as-database shape, the object owns SQLite,
  writes, and subscribers; a write method inserts/updates and publishes a payload-free pulse inside
  the same DO method. In the D1-as-truth shape, the DO is only an invalidation hub and streams reload
  D1. In both cases, the SSE event is never the source of truth, so reconnects recover by rendering
  the latest backend state and out-of-order payload patches cannot revert the UI.
- Use `src/lib/realtime/pulse.ts` for a DO-local sliding pulse hub and `src/lib/realtime/live-view.ts` for
  the shared Datastar stream shape. Do not publish rendered HTML or domain payloads through the hub;
  do not use unbounded subscriber queues for latest-state live views. See `/do` for DO-owned state
  and `/live-counter` for D1 + invalidation DO.

## Observability

- Each request emits exactly one structured "wide event" (canonical log line), written as JSON by
  `wideEventLogger` (`src/lib/observability/wide-event.ts`) via `Logger.consoleJson`. Cloudflare's own
  invocation logs are disabled (`invocation_logs: false` in `wrangler.jsonc`), so this line is the
  per-request record in Worker logs. The middleware adds `http.method/path/status/durationMs` and
  sets the level from the status (5xx → error, 4xx → warn, else info).
- Enrich the event from handlers with `annotate({ ... })` (`src/lib/observability/request-log.ts`) —
  not `Effect.log` or `Effect.annotateLogsScoped`. Scoped log annotations are restored when a
  handler's scope closes, so they never reach the end-of-request line; `annotate` writes to a
  per-request `Ref` (the `RequestLog` service) that the middleware reads once at the end.
- Keep annotations structured and namespaced by feature (`{ d1Counter: { ok, action } }`); never log
  secrets, tokens, or raw request bodies.
- Gotcha: install the logger with `Layer.provideMerge(Logger.layer([Logger.consoleJson]))`.
  `Layer.provide` is a no-op for it because nothing _requires_ `CurrentLoggers` — the logger only
  takes effect when merged into the runtime context.

## Layout

- `src/index.tsx` — Worker entry, service wiring, route merge, request context, and DO exports.
- `src/lib/datastar.ts` — Datastar/Effect bridge and signal decoding.
- `src/pages/<name>/index.tsx` — MPA page boundary: route registration, handlers, page-owned
  Datastar state, request parsing, and page-level error-to-response/UI mapping.
- `src/pages/<name>/components/` — page-local TSX components. Use simple names such as `page.tsx`,
  `form.tsx`, `count.tsx`, and `object-list.tsx`.
- `src/pages/<name>/tests/` — page route and browser tests (`page.test.ts`, `page.e2e.ts`).
- `src/pages/not-found.ts` — catch-all 404 route.
- `src/resources/<name>/` — Cloudflare resource-bound capabilities, adapters, schemas, Durable
  Object classes, and resource-owned tests. Examples: `d1`, `kv-counter`, `r2-objects`,
  `chat-room`, `live-rooms`.
- `src/resources/d1/` — D1 database factory, D1 Drizzle schema, and D1-backed capabilities such as
  the counter.
- `src/resources/chat-room/` — chat Durable Object class, its SQLite schema, and room logic/client.
- `src/services/<name>/` — non-Cloudflare external services or app capabilities, e.g.
  `github-repos`.
- `src/lib/observability/` and `src/lib/realtime/` — app glue with specific names.
- `src/ui/` — shared TSX layout/head helpers such as `layout.tsx` and `head.tsx`.
- `src/client/` — browser-only web components / modules, built by `scripts/build-client.ts`.
- `src/test/` — shared test helpers, test-only types, and Vitest setup.
- `public/` — Worker assets. Generated CSS/JS are gitignored; hand-authored assets are committed.
- `repos/` — vendored reference repos. See `AGENTS.d/vendored-repos.md`.

There are three TypeScript projects: root Worker/server code, `src/client` browser code, and
`scripts` Node code. `nub run typecheck` runs all three.

## Page flow

1. Create `src/pages/<name>/index.tsx` exporting a route `Layer` with `HttpRouter.add(...)` or
   `Layer.mergeAll(...)`.
2. Keep Datastar `state(...)` in `index.tsx` while the page is small. If handlers split later, move
   page-owned state to `src/pages/<name>/state.ts`.
3. Put server-rendered TSX in `src/pages/<name>/components/`.
4. Put Cloudflare resource-bound code in focused `src/resources/<resource>/` folders. Put external
   API/service integrations in `src/services/<service>/` folders.
5. Merge the page route layer in `src/index.tsx` and wire resources/services from raw Cloudflare
   bindings in `requestContext`.
6. Test page behavior through `loadApp()` and `app.fetch(request("/..."))`; keep route tests in the
   page's `tests/` folder and resource/service/domain tests in that module's `tests/` folder.

## Commands

- `nub run dev` — build assets, watch CSS/client bundles, and run `wrangler dev --live-reload`.
- `nub run build` — build `public/app.css` and `public/js/*.js`.
- `nub run preview` — build, then run `wrangler dev`.
- `nub run deploy` — build, then `wrangler deploy --minify`.
- `nub run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`.
- `nub run test` / `nub run test:watch` — Vitest in the Workers runtime.
- `nub run test:e2e` — Playwright against `wrangler dev` on port 8787.
- `nub run check` — typecheck, lint, format check, and Vitest.
- `nub run lint:fix` / `nub run format` — autofix lint/format issues.

`scripts/build-client.ts` uses esbuild's JS API because nub's bin shim does not work with esbuild's
native CLI binary. Keep that path unless the toolchain changes.
