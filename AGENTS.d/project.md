# Project guide

## Stack

- **Runtime:** Cloudflare Workers via `wrangler`. `src/server.tsx` exports the Worker `fetch`
  handler built from Effect's `HttpRouter`.
- **Toolchain:** `nub` for installs, scripts, package execution, and Node version management. Node
  is the build/dev toolchain, not the app runtime.
- **HTTP/UI:** Effect `HttpRouter` + server-rendered TSX through `datastar-kit`. Datastar responses
  pass through helpers in `src/datastar.ts`.
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

## Layout

- `src/server.tsx` — Worker entry, live service wiring, route merge, request context.
- `src/datastar.ts` — Datastar/Effect bridge and signal decoding.
- `src/pages/<name>/` — page routes, views, domain modules, capabilities, and colocated tests.
- `src/pages/not-found.ts` — catch-all 404 route.
- `src/cloudflare-env.ts` — raw Worker env service for low-level binding access.
- `src/ui/` — shared view helpers.
- `src/client/` — browser-only web components / modules, built by `scripts/build-client.ts`.
- `src/test-utils.ts` — `loadApp`, `request`, and `datastarPost` helpers.
- `public/` — Worker assets. Generated CSS/JS are gitignored; hand-authored assets are committed.
- `repos/` — vendored reference repos. See `AGENTS.d/vendored-repos.md`.

There are three TypeScript projects: root Worker/server code, `src/client` browser code, and
`scripts` Node code. `nub run typecheck` runs all three.

## Page flow

1. Create `src/pages/<name>/<name>.tsx` exporting a route `Layer` with `HttpRouter.add(...)`.
2. Put server-rendered TSX in `views.tsx`.
3. Put external services/adapters in focused capability modules.
4. Put pure parsing/domain rules in focused domain modules.
5. Merge the page route layer in `src/server.tsx`.
6. Test through `loadApp()` and `app.fetch(request("/..."))`.

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
