# Project guide

## Stack

- **Deploy target**: [Cloudflare Workers](https://workers.cloudflare.com/) (via `wrangler`).
  `src/server.tsx` is the worker entry (`export default app`). Static files come from the
  `assets` binding in `wrangler.jsonc`, not from a server route.
- **Toolchain**: [nub](https://nubjs.com/) — runs `.ts`/`.tsx`, manages scripts (`nub run`),
  packages (`nubx`), installs, and the Node version (`.node-version`). Node is the _build/dev_
  toolchain; the app _runs_ on the Workers runtime.
- **Hypermedia**: [Datastar](https://data-star.dev/) + `datastar-kit` for server-rendered TSX,
  `reply.*` responses, signals, and SSE patches. HTTP framework is **Hono**.
- **Core & validation**: [Effect](https://effect.website/) is the functional core. I/O lives in
  Effects with typed (tagged) errors (`src/pages/home/github.ts`); validation uses Effect `Schema`
  (`Schema.decodeUnknownEffect`) instead of zod. Route handlers are the imperative shell: they run
  programs with `runtime.runPromise(...)` (`src/runtime.ts`, which provides a `fetch`-based
  `HttpClient` via `FetchHttpClient.layer`), branch on the `Result`, and return field errors via
  `reply.signals(...)` or `event.signals(...)` inside a stream when an element patch is also needed.
  See `src/pages/home/home.tsx`. `FetchHttpClient` keeps the same code running on workerd and the
  Workers test pool — don't reach for Node/Bun platform HTTP clients in worker code.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) via the standalone CLI (zero runtime).
  `src/styles.css` is the entry; the CLI builds `public/app.css`, served from `assets` at `/app.css`.
- **Client islands**: [esbuild](https://esbuild.github.io/) bundles `src/client/<name>.ts` →
  `public/js/<name>.js`. Reference one from a view with `clientScript("name")`. Use only for
  behavior `data-*` attributes can't express — keep most interactivity server-driven.
- **Lint / format**: `oxlint` (type-aware) and `oxfmt`.
- **Tests**: `vitest` under `@cloudflare/vitest-pool-workers` — runs inside the Workers runtime
  (workerd/Miniflare), the same runtime prod deploys to. Drive the app directly with
  `app.fetch(new Request(...))`. Mock outbound HTTP with **MSW** via `@msw/cloudflare`.
- **E2E**: `@playwright/test` — colocated `*.e2e.ts` specs (`nub run test:e2e`), real browser
  against `wrangler dev`, for client-side behavior (Datastar SSE DOM patches, client islands).
  Not part of `nub run check`.
- **Hooks**: `simple-git-hooks` + `lint-staged` (pre-commit lints & formats staged files).

There is no `process.env` on Workers — env comes from bindings (typed in `worker-configuration.d.ts`,
regenerate with `nub run cf-typegen`). Don't reintroduce Node APIs (`fs`, `process`, `@hono/node-server`)
into worker code; Node is fine in `scripts/` and tests.

## Layout

Page-based MPA. `server.tsx` assembles the app; each page is a self-contained Hono sub-app
mounted under its URL prefix with `app.route(prefix, page)`.

- `src/server.tsx` — worker entry: assembles `app` (mounts page sub-apps + notFound) and
  `export default app`.
- `wrangler.jsonc` — Workers config (`main`, `compatibility_date`, `assets.directory`).
- `worker-configuration.d.ts` — generated binding/runtime types (committed; `nub run cf-typegen`).
- `src/constants.ts` — shared constants (Datastar runtime URL, site title).
- `src/pages/<name>/` — one folder per page: a Hono sub-app (`export default`) with its colocated
  views and `*.test.ts`. Add a local README only when the page/feature has domain vocabulary or
  workflow rules that are not obvious from the tests. `src/pages/home/` is the GitHub repo-lookup
  demo (form → external fetch → SSE patch); `src/pages/not-found.ts` is the 404.
- `src/ui/` — shared view helpers: `head.tsx` (`pageHead()` + `clientScript()`).
- `src/client/*.ts` — browser islands; bundled to `public/js/*.js` (gitignored) by
  `scripts/build-client.ts` (esbuild). Type-checked separately with DOM libs via `src/client/tsconfig.json`.
- `scripts/build-client.ts` — esbuild bundler. Uses esbuild's **JS API**, not its CLI: esbuild's
  `bin` is a native binary and nub's bin shim runs it through `node`, which crashes. Don't switch
  back to the `esbuild` CLI under nub.
- `src/test-utils.ts` — shared `request(...)` / `datastarPost(...)` helpers for tests.
- `src/styles.css` — Tailwind entry; built to `public/app.css` (gitignored).
- `public/` — static assets directory served by the Workers `assets` binding. Build output
  (`app.css`, `js/*`) is gitignored; hand-authored assets (favicon, etc.) are committed.

Three tsconfigs, each in its own directory so editors pick the right one (they only look for the
nearest `tsconfig.json` by name): `tsconfig.json` (worker/server, Workers libs),
`src/client/tsconfig.json` (browser/DOM), `scripts/tsconfig.json` (Node, also covers
`vitest.config.ts` and `playwright.config.ts`). All three run in `typecheck`.

Add a page: create `src/pages/<name>/<name>.tsx` exporting a Hono sub-app, then mount it in
`server.tsx`. Tests import the assembled app's `default` export from `server.js` (the real seam).

## Commands

- `nub run dev` — build assets, then watch Tailwind + esbuild client bundles + wrangler dev
  (`--live-reload`) on http://localhost:8787. wrangler hot-reloads the worker and auto-refreshes
  the browser on change.
- `nub run build` — build minified `public/app.css` + `public/js/*.js`.
- `nub run deploy` — build, then `wrangler deploy --minify`. `nub run preview` runs `wrangler dev`.
- `nub run cf-typegen` — regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc`.
- `nub run test` / `nub run test:watch` — vitest (Workers pool). `nub run test:e2e` — Playwright.
  Browser tests use fixed port 8787; if it is occupied, investigate/stop the conflict instead of
  silently switching ports.
- `nub run check` — typecheck (3 configs) + lint + format check + test. CI
  (`.github/workflows/ci.yml`) runs `nub ci` → `nub run check`. Builds run (allow-listed in
  `allowBuilds`): the Workers-pool tests need workerd's binary. Deploys are handled by Cloudflare Workers Builds (GitHub
  App), not CI — see README.
- `nub run lint:fix` / `nub run format` — autofix.

Packages whose build scripts we run (esbuild, @parcel/watcher, workerd) are allow-listed in
package.json's `allowBuilds`. Approve new ones with `nub approve-builds`. CI runs `nub ci` (not
`--ignore-scripts`) because the Workers-pool tests need workerd's binary wired up by its
postinstall. `simple-git-hooks` is explicitly denied as a dependency build because hooks are set by
the root `prepare` script (skipped when `$CI` is set).

nub is the package manager and script runner: `nub install` / `nub add` / `nub run <script>` /
`nubx <bin>`. The lockfile is nub's native `lock.yaml` (pnpm-compatible format). Default to nub.
