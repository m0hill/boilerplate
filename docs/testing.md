# Testing

## Test Choice

- Use `*.test.ts` for Worker/runtime behavior.
- Cover routes, Datastar payloads, Effect/domain logic, bindings, and MSW-backed external HTTP.
- Use `*.e2e.ts` only for browser behavior.
- Cover DOM updates, real clicks, focus, keyboard, and web components.
- `nub run check` runs Vitest.
- `nub run check` does not run Playwright.
- Run `nub run test:e2e` when browser behavior or Playwright config changes.

## Vitest

- Colocate tests with covered code.
- Page tests live in `src/pages/<page>/tests/`.
- Resource tests live in `src/resources/<resource>/tests/`.
- Service tests live in `src/services/<service>/tests/`.
- Drive server behavior through `loadApp()`.
- Use `app.fetch(request("/..."))`.
- Use `app.fetch(datastarPost("/...", signals))`.
- Assert status, content type, HTML, SSE events, signal patches, and user copy.
- Mock only outside the app boundary.
- Use `@msw/cloudflare` for external HTTP.
- Do not module-mock app code.
- Prefer real seams, in-memory adapters, Worker test bindings, and deterministic inputs.
- Keep pure domain tests on exported parsers, constructors, and domain functions.

## Realtime

- Test the initial SSE patch.
- Open the stream before the command that publishes.
- Assert subscribe-before-write delivery.
- Commands that update live regions mutate and publish.
- Those commands return `datastarDone()` or signal cleanup.
- Those commands do not patch the live region.
- Cover at least one convergence case for shared live state.
- Concurrent commands should eventually render durable current state.
- Older payloads must not win.
- Cancel stream readers when testing cleanup-sensitive code.

## Playwright

- Keep e2e offline.
- Keep e2e deterministic.
- Put external-dependent happy paths in MSW-backed Vitest tests.
- Prove the browser round trip: page load, action, Datastar request, SSE patch, DOM update.
- Browser tests use port 8787.
- If port 8787 is occupied, stop the conflict.
