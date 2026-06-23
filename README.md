# boilerplate

A TypeScript starter for hypermedia-driven apps on **Cloudflare Workers**.

| Concern        | Tool                                                               |
| -------------- | ------------------------------------------------------------------ |
| Deploy target  | [Cloudflare Workers](https://workers.cloudflare.com/) (`wrangler`) |
| Toolchain      | [nub](https://nubjs.com/) (runner, scripts, pm, nvm)               |
| Hypermedia     | [Datastar](https://data-star.dev/) + `datastar-kit`                |
| HTTP framework | [Hono](https://hono.dev/)                                          |
| Validation     | [zod](https://zod.dev/)                                            |
| Styling        | [Tailwind CSS v4](https://tailwindcss.com/) (CLI)                  |
| Client islands | [esbuild](https://esbuild.github.io/) bundles                      |
| Lint           | `oxlint` (type-aware)                                              |
| Format         | `oxfmt` (no semicolons)                                            |
| Tests          | `vitest`                                                           |
| Git hooks      | `simple-git-hooks` + `lint-staged`                                 |

## Setup

```sh
curl -fsSL https://nubjs.com/install.sh | bash   # once, if you don't have nub
nub install                                       # install deps + git hooks
```

## Develop

```sh
nub run dev        # build assets + watch + wrangler dev (http://localhost:8787)
nub run build      # build public/app.css + public/js/*.js
nub run deploy     # build, then wrangler deploy --minify
nub run preview    # build, then wrangler dev
nub run cf-typegen # regenerate worker-configuration.d.ts after editing wrangler.jsonc
nub run test       # vitest (use test:watch for watch mode)
nub run check      # typecheck (3 configs) + lint + format check + test
```

## Layout

Page-based MPA on Workers — `server.tsx` is the worker entry and mounts page sub-apps with
`app.route(prefix, page)`:

- `src/server.tsx` — worker entry (`export default app`).
- `wrangler.jsonc` — Workers config; static files come from `assets.directory` (`./public`).
- `src/pages/<name>/` — one folder per page (Hono sub-app + views + colocated test).
  `home/` is the counter demo.
- `src/ui/` — shared view helpers (`pageHead`, `clientScript`).
- `src/client/*.ts` — browser islands, bundled by esbuild to `public/js/`. Use sparingly —
  keep interactivity server-driven where possible.
- `src/constants.ts`, `src/test-utils.ts`, `src/styles.css`.
- `repos/` — vendored reference repos (git subtree, read-only). See `AGENTS.md`.
- `AGENTS.md` — guidance for AI agents and contributors.

A pre-commit hook runs `lint-staged` (oxlint --fix + oxfmt) on staged files.

## CI / CD

**CI** — `.github/workflows/ci.yml` runs on every push and PR: installs nub, `nub ci --ignore-scripts`,
then `nub run check` (typecheck + lint + format + test). No build/native binaries needed for the check.

**CD** — handled by [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
(the GitHub App), which auto-deploys on push and adds PR preview URLs — no GitHub secret needed.
One-time setup in the Cloudflare dashboard → **Workers & Pages → your Worker → Settings → Builds →
Connect repo**, then set:

- **Build command:** `curl -fsSL https://nubjs.com/install.sh | bash && export PATH="$HOME/.nub/bin:$PATH" && nub ci && nub run build`
- **Deploy command:** `npx wrangler deploy` (the default)

(nub isn't auto-detected from `lock.yaml`, so the build command bootstraps it explicitly.)

To deploy manually instead: `nubx wrangler login` once, then `nub run deploy`.
