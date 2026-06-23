# boilerplate

A Node + TypeScript starter for hypermedia-driven apps.

| Concern           | Tool                                                 |
| ----------------- | ---------------------------------------------------- |
| Runtime/toolchain | [nub](https://nubjs.com/) (runner, scripts, pm, nvm) |
| Hypermedia        | [Datastar](https://data-star.dev/) + `datastar-kit`  |
| HTTP framework    | [Hono](https://hono.dev/)                            |
| Validation        | [zod](https://zod.dev/)                              |
| Styling           | [Tailwind CSS v4](https://tailwindcss.com/) (CLI)    |
| Client islands    | [esbuild](https://esbuild.github.io/) bundles        |
| Lint              | `oxlint` (type-aware)                                |
| Format            | `oxfmt` (no semicolons)                              |
| Tests             | `vitest`                                             |
| Git hooks         | `simple-git-hooks` + `lint-staged`                   |

## Setup

```sh
curl -fsSL https://nubjs.com/install.sh | bash   # once, if you don't have nub
nub install                                       # install deps + git hooks
```

## Develop

```sh
nub run dev        # watch Tailwind + client bundles + serve on http://localhost:3000
nub run build      # build minified public/app.css + public/js/*.js for production
nub run test       # vitest (use test:watch for watch mode)
nub run check      # typecheck + lint + format check + test
nub run lint:fix   # autofix lint
nub run format     # autoformat
```

Set `PORT` to change the listen port.

## Layout

Page-based MPA — `server.tsx` mounts page sub-apps with `app.route(prefix, page)`:

- `src/index.tsx` — Node entry: serves `app`.
- `src/server.tsx` — assembles the app (pages + static + dev live-reload + 404).
- `src/pages/<name>/` — one folder per page (Hono sub-app + views + colocated test).
  `home/` is the counter demo.
- `src/ui/` — shared view helpers (`pageHead`, `clientScript`).
- `src/client/*.ts` — browser islands, bundled by esbuild to `public/js/`. Use sparingly —
  keep interactivity server-driven where possible.
- `src/dev/live-reload.ts`, `src/constants.ts`, `src/test-utils.ts`, `src/styles.css`.
- `repos/` — vendored reference repos (git subtree, read-only). See `AGENTS.md`.
- `AGENTS.md` — guidance for AI agents and contributors.

A pre-commit hook runs `lint-staged` (oxlint --fix + oxfmt) on staged files.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests: it installs nub,
runs `nub ci` (strict install from `lock.yaml`), `nub run build`, then `nub run check`
(typecheck + lint + format + test).
