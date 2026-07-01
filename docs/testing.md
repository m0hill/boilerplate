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
- Prefer vertical tracer bullets: one public behavior test, one implementation, then repeat.
- Do not write large batches of imagined tests before implementation; they lock design too early.
- Test public seams and real code paths, not private helpers or internal shapes.
- Drive server behavior through `loadApp()`.
- Use `app.fetch(request("/..."))`.
- Use `app.fetch(datastarPost("/...", signals))`.
- Assert status, content type, HTML, SSE events, signal patches, and user copy.
- Mock only outside the app boundary.
- Use `@msw/cloudflare` for external HTTP.
- Prefer real seams, in-memory adapters, Worker test bindings, and deterministic inputs.
- Override Effect `Clock.Clock` for deterministic time tests.
- Keep pure domain tests on exported parsers, constructors, and domain functions.

## Realtime

- Test the initial SSE patch.
- Open the stream before the command that publishes.
- Assert subscribe-before-write delivery.
- Commands that update live regions mutate and publish.
- Those commands return `datastarDone()` or signal cleanup.
- Cover at least one convergence case for shared live state.
- Concurrent commands should eventually render durable current state.
- Cancel stream readers when testing cleanup-sensitive code.

## Playwright

- Keep e2e offline.
- Keep e2e deterministic.
- Put external-dependent happy paths in MSW-backed Vitest tests.
- Prove the browser round trip: page load, action, Datastar request, SSE patch, DOM update.
- Browser tests use port 8787.
