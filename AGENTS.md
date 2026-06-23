# AGENTS.md

Node + TypeScript boilerplate for hypermedia-driven apps.

## Stack

- **Deploy target**: [Cloudflare Workers](https://workers.cloudflare.com/) (via `wrangler`).
  `src/server.tsx` is the worker entry (`export default app`). Static files come from the
  `assets` binding in `wrangler.jsonc`, not from a server route.
- **Toolchain**: [nub](https://nubjs.com/) — runs `.ts`/`.tsx`, manages scripts (`nub run`),
  packages (`nubx`), installs, and the Node version (`.node-version`). Node is the _build/dev_
  toolchain; the app _runs_ on the Workers runtime.
- **Hypermedia**: [Datastar](https://data-star.dev/) + `datastar-kit` for server-rendered TSX,
  `reply.*` responses, signals, and SSE patches. HTTP framework is **Hono**.
- **Validation**: [zod](https://zod.dev/) — parse incoming signals from `read.signals(...)` and
  return field errors via `reply.signals(...)`. See `src/pages/home/home.tsx`.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) via the standalone CLI (zero runtime).
  `src/styles.css` is the entry; the CLI builds `public/app.css`, served from `assets` at `/app.css`.
- **Client islands**: [esbuild](https://esbuild.github.io/) bundles `src/client/<name>.ts` →
  `public/js/<name>.js`. Reference one from a view with `clientScript("name")`. Use only for
  behavior `data-*` attributes can't express — keep most interactivity server-driven.
- **Lint / format**: `oxlint` (type-aware) and `oxfmt`.
- **Tests**: `vitest` — drive the app directly with `app.fetch(new Request(...))`, no port/runtime.
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
  views and `*.test.ts`. `src/pages/home/` is the counter demo; `src/pages/not-found.ts` is the 404.
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
`vitest.config.ts`). All three run in `typecheck`.

Add a page: create `src/pages/<name>/<name>.tsx` exporting a Hono sub-app, then mount it in
`server.tsx`. Tests import the assembled app's `default` export from `server.js` (the real seam).

## Commands

- `nub run dev` — build assets, then watch Tailwind + esbuild client bundles + `wrangler dev`
  (local Workers runtime on http://localhost:8787). wrangler hot-reloads the worker on save;
  refresh the browser manually.
- `nub run build` — build minified `public/app.css` + `public/js/*.js`.
- `nub run deploy` — build, then `wrangler deploy --minify`. `nub run preview` runs `wrangler dev`.
- `nub run cf-typegen` — regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc`.
- `nub run test` / `nub run test:watch` — vitest.
- `nub run check` — typecheck (3 configs) + lint + format check + test. CI
  (`.github/workflows/ci.yml`) runs `nub ci` → `nub run build` → `nub run check`.
  Deploys are handled by Cloudflare Workers Builds (GitHub App), not CI — see README.
- `nub run lint:fix` / `nub run format` — autofix.

Packages with build scripts (esbuild, @parcel/watcher, simple-git-hooks) are allow-listed in
package.json's `allowBuilds` so `nub ci` runs their postinstalls. Approve new ones with
`nub approve-builds`.

nub is the package manager and script runner: `nub install` / `nub add` / `nub run <script>` /
`nubx <bin>`. The lockfile is nub's native `lock.yaml` (pnpm-compatible format). Default to nub.

## Conventions

- App is hypermedia-driven: render TSX on the server, return `reply.page(...)` for full documents
  and `reply.patch(...)` for focused updates. Avoid client-side state where a server patch works.
- `jsxImportSource` is `datastar-kit` (see `tsconfig.json`) — JSX compiles to datastar-kit, not React.
- Validate untrusted input (signals, params) with a zod schema and `safeParse`; surface failures as
  signal errors (`reply.signals(...)`) rather than throwing.
- No semicolons (oxfmt config). Strict TypeScript is on.

## Code quality

Follow existing project conventions first; if none exist, follow these. Prefer small local
improvements over broad rewrites. When rules conflict, prioritize correctness, safety, and
debuggability.

**Parse at the boundary, keep domain types inside.**

- Parse untrusted input once at the edge: `unknown -> DTO -> domain type`. Don't sprinkle ad-hoc
  validation through core logic, and don't pass raw DTOs/IDs/`Partial<T>` into it.
- Parse env/config once at startup into typed config. Don't read `process.env` throughout the app.

**Make invalid states unrepresentable.**

- Brand meaningful primitives (IDs, emails, money, durations) and build them only through
  parsers/smart constructors.
- Prefer discriminated unions over boolean flag bags + nullable fields. Model lifecycles as tagged
  unions/state machines. Avoid behavior-controlling boolean params; use named options.

**Let types flow from the source of truth.** Derive (`Pick`, `Omit`, `ReturnType`, `typeof`,
indexed access) instead of restating shapes. Don't duplicate existing entities as new interfaces.

**TypeScript safety.** No `any`, no non-null `!`, no `as Type` casts (`as const` is fine) — branch,
parse, or refine instead. Rare unavoidable casts get a `SAFETY:` comment. Use `import type`. Prefer
`readonly`/`ReadonlyArray`. Prefer precise file names (`email-address.ts`) over `utils.ts`. Avoid
barrel files; export only what callers need. JSDoc exported APIs; comment invariants, not obvious code.

**Model expected failures as values, not exceptions.** Domain/parsing/auth/IO/persistence failures
go in the return type (a tagged `Result`/the project's error pattern), not a rejected promise.
Throw/reject only for unrecoverable defects (violated invariants, impossible branches, startup
misconfig, `notYetImplemented`). Keep error unions precise at module boundaries.

**Deep modules, functional core / imperative shell.** Pure domain logic inside; I/O, parsing,
telemetry, time/randomness, framework glue at the boundary. Deletion test: a module worth keeping
spreads complexity across callers when removed; a pass-through wrapper makes complexity vanish.
Avoid shallow wrappers and vague `Manager`/`Helper`/`Processor` names. Inject dependencies (clock,
randomness, adapters); avoid mutable singletons and import-time I/O outside entrypoints.

**Keep runtime checks meaningful.** Validate at real boundaries (user input, network, JSON,
external APIs). Remove internal checks that only compensate for weak types or duplicate a guarantee
the type system already gives.

**Observability & secrets.** Prefer structured tracing/spans over print logging; include safe
diagnostic fields (domain IDs, operation names, error tags). Never put secrets in errors/logs/
traces/fixtures; wrap credentials in a `Redacted<T>` and unwrap only where needed.

**Tests through real seams** (see Testing philosophy below). No module mocking (`vi.mock`); use
constructor-injected interfaces, in-memory/local adapters, or local DBs. Assert observable behavior;
don't bypass parsers or invariants in tests.

## Tailwind and vanilla CSS split

Use Tailwind and CSS as a hybrid system, not as opposing religions.

- Tailwind applies the design system locally: component layout, spacing, responsive behavior,
  typography application, tokenized colors, borders/radii, and normal hover/focus/active/dark states.
- CSS defines the design system and handles cascade-native/global problems: `@theme` tokens,
  `@font-face`, base/reset styles, focus defaults, prose/markdown/CMS content, complex selectors,
  custom utilities, keyframes, third-party overrides, and hard-to-read arbitrary values.
- Prefer components/partials for repeated UI. Do not create CSS classes or `@apply` blocks just to
  hide long Tailwind class strings.
- `@apply` is an escape hatch, not the architecture. Use it mainly for tiny single-element
  primitives, third-party overrides, or non-component templating contexts.
- Arbitrary values are fine for true one-offs (`top-[117px]`, custom grid tracks, CSS variables).
  If repeated, promote the value into a token, utility, or component API.
- If a selector becomes unreadable as Tailwind arbitrary variants, move it to CSS.
- For content-heavy surfaces, docs, markdown, WYSIWYG, or semantic prose, lean more on
  CSS/base/prose rules because the generated HTML cannot reliably carry utility classes.
- For component-heavy product UI, lean Tailwind-first, with CSS kept small and deliberate.
- Do not add Tailwind to a tiny static page only because it is trendy; if Tailwind is already in
  the project, use the existing system.
- Knowing CSS remains required. Tailwind is a productivity layer over CSS, not a replacement for
  understanding layout, cascade, inheritance, specificity, and accessibility.

## Testing philosophy

Loosely follows [Artem Zakharchenko](https://www.epicweb.dev/contributors/artem-zakharchenko)
(MSW creator). The aim: tests that fail **only** when the intent of the system is broken.

- **Test intention, not implementation.** Drive the app through its real boundary —
  `app.fetch(request("/..."))` — and assert on the response a user would receive (rendered
  HTML, SSE patches, status). Don't reach into internal state (e.g. the `count` variable).
- **Colocate tests** next to the code (`foo.tsx` → `foo.test.ts`), not in a separate tree.
- **Don't over-mock.** Run the whole app for real; mock only what's _outside_ the boundary:
  network calls to external services, side effects, and non-deterministic values (time, random).
  There's nothing external here yet, so there are no mocks — keep it that way until there is.
- **Don't assert on outgoing requests** — assert on the resulting outcome. If/when you add
  external HTTP, intercept at the network with **MSW**: validate the payload _inside_ the handler
  and let a wrong request surface as a failed outcome assertion.
- **Trust Vitest's defaults** (isolated files, parallel execution, explicit imports over
  `globals`). Keep `vitest.config.ts` minimal. Prefer `.resolves`/`.rejects` chaining.
- **Real browser over JSDOM** if client-side behavior ever needs testing (Vitest browser mode or
  Playwright) — but server-rendered output is tested directly in the node environment.

## Vendored Repositories

This project vendors external repositories under @repos/.

- Use @repos/datastar-kit as read-only reference material when writing Datastar Kit code.
- Inspect its source, tests, examples, and docs for idiomatic Datastar authoring helpers, `read`, `reply`, JSX, signals, patches, streams, and Request/Response patterns.
- Prefer patterns from the vendored source over generated guesses or web search.
- Do not edit files under @repos/ unless explicitly asked.
- Do not import from @repos/; application code should import from package dependencies.
