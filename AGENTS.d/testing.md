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

- Colocate tests next to the code they cover: page route/browser tests in `src/pages/<page>/tests/`, resource tests in `src/resources/<resource>/tests/`, and service/domain tests in `src/services/<service>/tests/`.
- Drive server behavior through the real Worker seam: `loadApp()` then
  `app.fetch(request("/..."))` or `app.fetch(datastarPost("/...", signals))`.
- Assert observable output: status, content type, rendered HTML, SSE events, signal patches, and
  user-facing copy.
- Mock only things outside the app boundary. Use `@msw/cloudflare` for external HTTP.
- Do not use module mocks for app code. Prefer real seams, local/in-memory adapters, Worker test
  bindings, or deterministic inputs.
- Keep pure domain tests focused on exported parsers, constructors, and domain functions.

## Realtime test patterns

- For Datastar live views, test the initial SSE patch, then subscribe-before-write delivery by
  opening the stream before the command that publishes the pulse.
- Commands that update a live region should mutate + publish and then return `datastarDone()` or a
  signal patch for form cleanup; test that they do not also patch the live region.
- Cover at least one convergence case for shared live state: concurrent commands should eventually
  render the durable current state without reverting to an older payload.
- Cancel a stream reader in a Vitest test when checking cleanup-sensitive code so the DO subscriber
  finalizer runs.

## Playwright patterns

- Keep e2e tests offline and deterministic. External-dependent happy paths belong in MSW-backed
  Vitest tests.
- Use e2e to prove the browser round trip works: page load, user action, Datastar request, SSE
  patch, and DOM update.
- Browser tests use fixed port 8787. If it is occupied, stop the conflict instead of changing ports.
