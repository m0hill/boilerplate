# Project

## Stack

- `alchemy.run.ts` owns Cloudflare resources, bindings, assets, and stages.
- `src/index.tsx` exports the Worker `fetch` handler and DO classes.
- `src/app.tsx` owns route composition, middleware, and request-context service wiring.
- HTTP uses Effect `HttpRouter`.
- Keep hypermedia and SSE routes on `HttpRouter`.
- Use small `HttpApi` contract slices when JSON APIs need schema-first routing.
- UI is server-rendered TSX through `datastar-kit`.
- Datastar helpers live in `src/lib/datastar.ts`.
- Tailwind builds `src/styles.css` to `public/app.css`.
- `scripts/build-client.ts` bundles `src/client/` to `public/js/`.
- Vitest runs in the Workers runtime.
- Playwright runs against `alchemy dev`.

## UI

- Default to server TSX + Datastar `data-*` + SSE.
- Use native inputs and `data-bind` for form state.
- Use a web component when browser APIs are required.
- Keep Datastar owning inputs.
- Feed web components through `data-attr`.
- Emit web component events through `data-on`.
- `/web-component` is the pattern.

## State

- Prefer Durable Objects for stateful features.
- Prefer DO-owned SQLite for strongly consistent owner state.
- Use one named DO instance per consistency boundary.
- Address DOs with `NAMESPACE.idFromName(name)`.
- Name DO instances by owner: `room:<id>`, `user:<id>`, `doc:<id>`.
- Keep DO SQLite schema and logic with the DO resource.
- Expose narrow DO RPC methods.
- Return parsed domain values from DO RPC methods.
- Adapt DO namespaces into worker-side services before page code uses them.
- Run Effect at the DO seam with `Effect.runPromise` or `Effect.runSync`.
- Use D1 for global relational queries across owners.
- Use KV for cheap eventually-consistent reads.
- Do not turn public KV misses into Durable Object fallback reads.
- For D1 + live UI, use a DO as an invalidation hub.
- `/do` shows DO-owned state.
- `/live-counter` shows D1 + invalidation DO.

## Realtime

- Truth lives in D1, KV, or a DO.
- Subscribe before first read.
- Render current state as the first event.
- Commands mutate truth.
- Commands publish a payload-free pulse.
- Streams re-read truth after each pulse.
- Reconnects render current backend state.
- Streams patch live regions.
- Commands do not patch shared live regions with durable markup.
- Commands return `datastarDone()` for success-only updates.
- Commands patch signals for form cleanup or user-fixable errors.
- Use `src/lib/realtime/pulse.ts` for DO-local sliding pulses.
- Use `src/lib/realtime/live-view.ts` for Datastar streams.

## Observability

- Each request emits one structured wide event.
- `wideEventLogger` writes it.
- The wide event is the per-request Worker log record.
- Middleware adds `http.method`, `http.path`, `http.status`, and `http.durationMs`.
- `http.durationMs` is based on Worker timers; in production it advances after I/O, not during CPU-only work.
- Add request fields with `annotate`.
- Use namespaced fields: `{ d1Counter: { action, ok } }`.
- Keep secrets, tokens, and raw request bodies out of logs.
- Install structured console logging with `Layer.provideMerge(Logger.layer([Logger.consoleStructured]))`.

## Layout

- `src/index.tsx` — Worker entry and DO exports.
- `src/app.tsx` — route merge, middleware, and request-context service wiring.
- `src/lib/datastar.ts` — Datastar/Effect bridge and signal decoding.
- `src/pages/<name>/index.tsx` — routes, handlers, Datastar state, parse errors.
- `src/pages/<name>/components/` — page-local TSX.
- `src/pages/<name>/tests/` — route and browser tests.
- `src/pages/not-found.ts` — catch-all 404.
- `src/resources/<name>/` — Cloudflare adapters, schemas, DOs, persistence.
- `src/services/<name>/` — external services and non-Cloudflare capabilities.
- `src/lib/` — named glue such as Datastar, observability, realtime.
- `src/client/` — browser-only web components and modules.
- `src/test/` — shared test helpers.
- `public/` — Worker assets.
- `repos/` — read-only references.

## Add A Page

- Create `src/pages/<name>/index.tsx`.
- Export a route `Layer`.
- Register routes with `HttpRouter.add(...)`.
- Use `Layer.mergeAll(...)` when a page has multiple routes.
- Keep small page state in `index.tsx`.
- Move larger page state to `src/pages/<name>/state.ts`.
- Put page TSX in `components/`.
- Put resource code in `src/resources/<resource>/`.
- Put external API code in `src/services/<service>/`.
- Merge the route in `src/app.tsx`.
- Wire services from raw bindings in `makeRequestContext`.
- Test with `loadApp()` and `app.fetch(request("/..."))`.
- Use `loadAppWithContext(() => makeRequestContext(...))` when a route test needs explicit service adapters.

## Commands

- `nub run dev` — build, watch CSS/client JS, run `alchemy dev`.
- `nub run build` — build CSS and browser JS.
- `nub run preview` — build once, run `alchemy dev`.
- `nub run deploy` — build, deploy selected stage.
- `nub run destroy` — destroy selected stage.
- `nub run logs` / `nub run tail` — Worker logs.
- `nub run test` — Vitest Workers tests.
- `nub run test:e2e` — Playwright on port 8787.
- `nub run check` — typecheck, lint, format check, Vitest.
- `nub run lint:fix` / `nub run format` — autofix.

Three TS projects exist: Worker (`tsconfig.json`), `src/client`, and `scripts`.
