# Project

## Stack

- Require Node 24 or newer.
- `src/index.tsx` owns startup through `@effect/platform-node`.
- `src/app.tsx` owns route composition, middleware, and application-scoped service wiring.
- HTTP uses Effect `HttpRouter` and Node's HTTP server.
- UI is server-rendered TSX through `datastar-kit`.
- Datastar helpers live in `src/lib/datastar.ts`.
- Drizzle uses Node's built-in synchronous SQLite driver through `drizzle-orm/node-sqlite`.
- Tailwind builds `src/styles.css` to `dist/public/app.css`.
- `scripts/build-client.ts` bundles `src/client/` to `dist/public/js/`.
- `scripts/build-server.ts` bundles application code to `dist/server.js` and keeps npm packages external.
- Vitest runs in Node.
- Playwright runs against the compiled Node server with a migrated temporary database.

## Runtime Configuration

- `src/server/config.ts` owns `HOST`, `PORT`, and `DATABASE_PATH` through Effect Config.
- Defaults are `0.0.0.0`, `3000`, and `./data/app.db`.
- Actual environment variables override optional `.env` values.
- Application modules do not read `process.env` directly.
- Malformed configuration fails startup.

## UI

- Default to server TSX + Datastar `data-*` + SSE.
- Use native inputs and `data-bind` for form state.
- Use a web component when browser APIs are required.
- Keep Datastar owning inputs.
- Feed web components through `data-attr`.
- Emit web component events through `data-on`.
- `/web-component` is the pattern.

## State

- Put persistent server state behind a typed Effect service.
- Use `src/services/sqlite/database.ts` for the scoped database lifecycle.
- Keep Drizzle tables in `src/services/sqlite/schema.ts`.
- Decode stored rows at the persistence boundary.
- Keep migrations explicit; server startup validates schema readiness and never applies migrations.
- `DATABASE_PATH` may be relative to the process working directory or absolute.
- The database layer creates the configured parent directory.
- Node's built-in SQLite API is synchronous and can block the event loop during long operations.
- `/sqlite` shows the persistent counter pattern.

## Realtime

- SQLite is durable truth.
- Application-scoped Effect PubSub carries payload-free invalidation pulses.
- Subscribe before the first database read.
- Render current state as the first event.
- Commands persist, publish, and return `datastarDone()`.
- Commands do not patch the shared live region directly.
- Streams re-read SQLite after each pulse and patch the live region.
- Reconnects and server restarts recover current SQLite state.
- Cancelled responses release stream subscriptions and scopes.
- This pattern coordinates tabs connected to one Node process only.
- Add an external broker before running realtime state across multiple processes or replicas.

## Observability

- Each request emits one structured wide event.
- `wideEventLogger` writes it.
- Middleware adds `http.method`, `http.path`, `http.status`, and `http.durationMs`.
- Add action fields with `annotateAction`.
- Keep secrets, tokens, and raw request bodies out of logs.
- Install structured console logging at application composition.

## Routes

- `/` — landing page.
- `/sqlite` — persistent SQLite counter.
- `/realtime` — SQLite-backed single-process realtime counter.
- `/api` — external GitHub API example.
- `/web-component` — browser custom-element example.
- `/design` — UI token and primitive showcase.
- Static assets are served from `dist/public` before application routes.
- Missing assets and unknown application routes return separate `404` responses.

## Layout

- `src/index.tsx` — Node entrypoint and scoped server launch.
- `src/app.tsx` — route merge, middleware, and application service wiring.
- `src/server/` — configuration, static assets, and migration entrypoint.
- `src/services/sqlite/` — database lifecycle, schema, and persistence service.
- `src/services/realtime-counter/` — application-scoped PubSub workflow.
- `src/services/<name>/` — external services and other server capabilities.
- `src/pages/<name>/` — routes, handlers, components, and tests.
- `src/ui/` — design-system primitives and page chrome.
- `src/lib/` — named shared glue such as Datastar and observability.
- `src/client/` — browser-only web components and modules.
- `src/test/` — shared Node test helpers.
- `migrations/sqlite/` — generated SQLite migrations.
- `dist/` — generated production server and assets.
- `repos/` — read-only references.

## Add A Page

- Create `src/pages/<name>/index.tsx`.
- Export a route `Layer`.
- Register routes with `HttpRouter.add(...)`.
- Use `Layer.mergeAll(...)` when a page has multiple routes.
- Put page TSX in `components/` and tests in `tests/`.
- Put persistence and external I/O behind a service in `src/services/`.
- Merge the route in `src/app.tsx`.
- Provide service Layers at the application composition root.
- Test through `loadApp()` and its returned `fetch` function.

## Commands

- `nub run dev` — build once, watch CSS/client/server output, and restart compiled Node on changes.
- `nub run build` — recreate `dist/` with the server and static assets.
- `nub run start` — run `dist/server.js` with Node.
- `nub run db:generate` — generate migrations from the Drizzle schema.
- `nub run db:migrate` — explicitly apply pending migrations.
- `nub run test` — run Node Vitest tests.
- `nub run test:e2e` — run Playwright against a compiled server and temporary migrated database.
- `nub run check` — typecheck, lint, format check, and Vitest.
- `nub run lint:fix` / `nub run format` — autofix.

Three TypeScript projects exist: server application, `src/client`, and `scripts`.
