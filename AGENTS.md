# AGENTS.md

Project guidance for agents and contributors. Read this first, then the guide in `AGENTS.d/`
for the area you are changing.

## Guides

- `AGENTS.d/project.md` — stack, runtime boundaries, layout, commands, and page flow.
- `AGENTS.d/code-quality.md` — TypeScript, domain boundaries, and module shape.
- `AGENTS.d/testing.md` — Vitest Workers tests, Playwright e2e tests, MSW, and test seams.
- `AGENTS.d/styling.md` — Tailwind v4 and CSS split.
- `AGENTS.d/vendored-repos.md` — read-only Datastar Kit and Effect reference repos.

## Rules

- Use `nub` for package and script work: `nub install`, `nub add`, `nub run <script>`,
  `nubx`.
- Worker code must run on Cloudflare Workers. Do not use Node runtime APIs in app code
  (`fs`, `process.env`, Node HTTP servers). Node is fine in `scripts/` and tests.
- Keep interactions hypermedia-first: server-rendered TSX, Datastar signals/actions, and SSE
  patches. Add client islands only for browser-only behavior.
- Routes use Effect's `HttpRouter`; handlers return `HttpServerResponse`. Return Datastar
  responses through `src/datastar.ts` helpers.
- Validate untrusted input at boundaries with Effect `Schema`. Model expected failures as tagged
  errors and return user-fixable errors as signal patches.
- Use `*.test.ts` for Workers/domain behavior and `*.e2e.ts` only for browser behavior.
- Strict TypeScript is on. Avoid `any`, non-null assertions, and `as Type` casts; parse, branch,
  or refine instead. `as const` is fine.
- Run `nub run check` before handing off. Run `nub run test:e2e` when browser behavior or
  Playwright config changes.
