# AGENTS.md

Node + TypeScript boilerplate for hypermedia-driven apps.

This root file is the index. Before changing an area, read the matching guide in
`AGENTS.d/` completely and follow it together with the quick rules below.

## Guides

- `AGENTS.d/project.md` — stack, Worker constraints, layout, commands, and page structure.
- `AGENTS.d/code-quality.md` — conventions, TypeScript/domain quality, boundaries, and durable
  decisions.
- `AGENTS.d/testing.md` — TDD workflow, Vitest/Workers-pool seams, Playwright, MSW, and mocking.
- `AGENTS.d/styling.md` — Tailwind v4 and vanilla CSS split.
- `AGENTS.d/vendored-repos.md` — how to use vendored Datastar Kit and Effect repos.

## Quick rules

- Default to `nub` for package/script work: `nub install`, `nub add`, `nub run <script>`, `nubx`.
- The app deploys to Cloudflare Workers. Do not introduce Node runtime APIs (`fs`, `process.env`,
  `@hono/node-server`) into worker code; Node is fine in `scripts/` and tests.
- Keep the app hypermedia-driven: server-render TSX, Datastar signals/actions, SSE patches, and
  tiny client islands only when `data-*` behavior cannot express the interaction.
- The HTTP layer is Effect's `HttpRouter` (`effect/unstable/http`); route handlers are `Effect`s
  returning an `HttpServerResponse`, wired up in `src/server.tsx` via `HttpRouter.toWebHandler` →
  `export default { fetch }`. Wrap datastar-kit responses with `HttpServerResponse.raw(...)`.
- Validate untrusted input at the boundary with Effect `Schema` (`Schema.decodeUnknownEffect`);
  model expected failures as tagged errors in the Effect's error channel and return signal patches
  instead of throwing for user-fixable input errors.
- Tests should drive real seams: `app.fetch(request("/..."))` for server behavior, MSW only for
  external HTTP, Playwright only for browser/client-island behavior.
- Strict TypeScript is on. Avoid `any`, non-null assertions, and `as Type` casts (`as const` is
  fine); branch, parse, or refine instead.
- For a full validation pass run `nub run check`. Run `nub run test:e2e` when changing browser-only
  behavior or Playwright configuration.
