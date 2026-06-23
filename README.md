# boilerplate

A TypeScript starter for hypermedia-driven apps on **Cloudflare Workers**.

| Concern        | Tool                                                               |
| -------------- | ------------------------------------------------------------------ |
| Deploy target  | [Cloudflare Workers](https://workers.cloudflare.com/) (`wrangler`) |
| Toolchain      | [nub](https://nubjs.com/) (runner, scripts, pm, nvm)               |
| Hypermedia     | [Datastar](https://data-star.dev/) + `datastar-kit`                |
| Core / HTTP    | [Effect](https://effect.website/) (`HttpRouter`, `HttpClient`)     |
| Validation     | [Effect `Schema`](https://effect.website/docs/schema/introduction) |
| Styling        | [Tailwind CSS v4](https://tailwindcss.com/) (CLI)                  |
| Client islands | [esbuild](https://esbuild.github.io/) bundles                      |
| Lint           | `oxlint` (type-aware)                                              |
| Format         | `oxfmt` (no semicolons)                                            |
| Tests          | `vitest` (Workers pool) + `msw` mocks, `@playwright/test` (e2e)    |
| Git hooks      | `simple-git-hooks` + `lint-staged`                                 |

## Setup

```sh
curl -fsSL https://nubjs.com/install.sh | bash   # once, if you don't have nub
nub install                                       # install deps + git hooks
```

## Develop

```sh
nub run dev        # build + watch + wrangler dev --live-reload (http://localhost:8787)
nub run build      # build public/app.css + public/js/*.js
nub run deploy     # build, then wrangler deploy --minify
nub run preview    # build, then wrangler dev
nub run cf-typegen # regenerate worker-configuration.d.ts after editing wrangler.jsonc
nub run test       # vitest in the Workers runtime (use test:watch for watch mode)
nub run test:e2e   # Playwright browser tests (first run: nubx playwright install chromium)
nub run check      # typecheck (3 configs) + lint + format check + test
```

## Layout

Page-based MPA on Workers — `server.tsx` is the worker entry, merging page route layers into an
Effect `HttpRouter` and exporting a Web handler (`export default { fetch }`):

- `src/server.tsx` — worker entry, live service composition, and Web handler export
  (`HttpRouter.toWebHandler` → `export default { fetch }`).
- `wrangler.jsonc` — Workers config; static files come from `assets.directory` (`./public`).
- `src/pages/<name>/` — one folder per page, split into a route layer, signal schemas,
  capability/domain modules, views, and colocated tests.
  `home/` is the GitHub repo-lookup demo (`home.test.ts` integration, `home.e2e.ts` browser);
  `counter/` is a KV-binding demo (persistent counter via a request-scoped `CounterStore` service
  adapted from the `COUNTER_KV` namespace).
- `src/cloudflare-env.ts` — low-level `CloudflareEnv` service for raw Worker binding access when a
  feature cannot use a narrower domain capability.
- `src/ui/` — shared view helpers (`pageHead`, `clientScript`).
- `src/client/*.ts` — browser islands, bundled by esbuild to `public/js/`. Use sparingly —
  keep interactivity server-driven where possible.
- `src/constants.ts`, `src/test-utils.ts`, `src/styles.css`.
- `repos/` — vendored reference repos (git subtree, read-only). See `AGENTS.md`.
- `AGENTS.md` — guidance for AI agents and contributors.

A pre-commit hook runs `lint-staged` (oxlint --fix + oxfmt) on staged files.

## CI / CD

**CI** — `.github/workflows/ci.yml` runs on every push and PR: installs nub, `nub ci`,
then `nub run check` (typecheck + lint + format + test). The Workers-pool tests run on workerd, so its binary is built on install (allow-listed in `allowBuilds`); git hooks are installed only by the root `prepare` script outside CI.

**CD** — handled by [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
(the GitHub App), which auto-deploys on push and adds PR preview URLs — no GitHub secret needed.
One-time setup in the Cloudflare dashboard → **Workers & Pages → your Worker → Settings → Builds →
Connect repo**, then set:

- **Build command:** `curl -fsSL https://nubjs.com/install.sh | bash && export PATH="$HOME/.nub/bin:$PATH" && nub ci && nub run build`
- **Deploy command:** `npx wrangler deploy` (the default)

(nub isn't auto-detected from `lock.yaml`, so the build command bootstraps it explicitly.)

To deploy manually instead: `nubx wrangler login` once, then `nub run deploy`.
