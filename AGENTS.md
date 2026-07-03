# AGENTS.md

Read this first.

Then read the narrow `docs/` guide for files you touch.

## Guides

- `project.md` — stack, layout, pages, state, realtime, commands.
- `datastar.md` — Datastar Kit, signals, patches, streams, and footguns.
- `alchemy.md` — `alchemy.run.ts`, resources, bindings, assets, deploy.
- `drizzle-effect.md` — Drizzle, D1, DO SQLite, Effect Schema.
- `effect.md` — Services, Layers, Schema, typed errors.
- `code-quality.md` — TypeScript and module boundaries.
- `testing.md` — Vitest Workers tests and Playwright e2e.
- `styling.md` — design tokens, `src/ui/` primitives, Tailwind v4.
- `vendored-repos.md` — read-only reference repos.

## Global

- Use `nub`: `nub install`, `nub add`, `nub run <script>`, `nubx`.
- App code runs on Cloudflare Workers.
- Worker app code uses Web and Cloudflare runtime APIs instead of `fs`, `process.env`, or Node HTTP servers.
- Node APIs are fine in `scripts/` and tests.
- Prefer server TSX + Datastar + SSE.
- Prefer native inputs with `data-bind` before client code.
- Use `src/client/` web components for canvas, charts, audio, and browser-only logic.
- Use plain imperative JS after Datastar and web components are a bad fit.
- Routes use Effect `HttpRouter`.
- Handlers return `HttpServerResponse`.
- Datastar responses use `src/lib/datastar.ts`.
- Parse untrusted input with Effect `Schema`.
- Model expected failures as tagged errors.
- Return user-fixable errors as signal patches.
- Keep strict TypeScript clean.
- Use parsed and narrowed types instead of `any`, non-null assertions, and `as Type`.
- Run `nub run check` before handoff.
- Run `nub run test:e2e` when browser behavior changes.
