# AGENTS.md

Read this first.

Then read the narrow `docs/` guide for files you touch.

## Guides

- `project.md` — Node stack, layout, routes, state, realtime, and commands.
- `datastar.md` — Datastar Kit, signals, patches, streams, and footguns.
- `drizzle-effect.md` — Drizzle, Node SQLite, migrations, and Effect Schema.
- `effect.md` — Services, Layers, Schema, typed errors, and lifecycle.
- `code-quality.md` — TypeScript and module boundaries.
- `documentation.md` — writing and maintaining agent docs.
- `testing.md` — Node Vitest tests and Playwright e2e.
- `styling.md` — design tokens, `src/ui/` primitives, and Tailwind v4.
- `vendored-repos.md` — read-only reference repos.

## Global

- Use `nub`: `nub install`, `nub add`, `nub run <script>`, `nubx`.
- Require Node 24 or newer.
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
- Read `docs/documentation.md` before creating or editing Markdown docs.
- Run `nub run db:migrate` before starting the server with a new database.
- Run `nub run check` before handoff.
- Run `nub run test:e2e` when browser behavior changes.
