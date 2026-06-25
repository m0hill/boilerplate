# Testing guide

## Test types

- `*.test.ts` runs with Vitest in the Cloudflare Workers runtime. Use it for route behavior,
  Datastar response payloads, Effect/domain logic, Worker bindings, and external-HTTP flows mocked
  with MSW.
- `*.e2e.ts` runs with Playwright against `wrangler dev`. Use it only for browser behavior:
  Datastar DOM updates, real form/click flows, focus/keyboard behavior, and web components.
- `nub run check` runs Vitest but not Playwright. Run `nub run test:e2e` when browser behavior or
  Playwright config changes.

## Vitest patterns

- Colocate tests next to the feature they cover.
- Drive server behavior through the real Worker seam: `loadApp()` then
  `app.fetch(request("/..."))` or `app.fetch(datastarPost("/...", signals))`.
- Assert observable output: status, content type, rendered HTML, SSE events, signal patches, and
  user-facing copy.
- Mock only things outside the app boundary. Use `@msw/cloudflare` for external HTTP.
- Do not use module mocks for app code. Prefer real seams, local/in-memory adapters, Worker test
  bindings, or deterministic inputs.
- Keep pure domain tests focused on exported parsers, constructors, and domain functions.

## Playwright patterns

- Keep e2e tests offline and deterministic. External-dependent happy paths belong in MSW-backed
  Vitest tests.
- Use e2e to prove the browser round trip works: page load, user action, Datastar request, SSE
  patch, and DOM update.
- Browser tests use fixed port 8787. If it is occupied, stop the conflict instead of changing ports.
