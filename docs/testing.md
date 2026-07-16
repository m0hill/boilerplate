# Testing

## Test Choice

- Use `*.test.ts` for Node server, route, service, persistence, and Datastar behavior.
- Use `*.e2e.ts` only for browser behavior.
- `nub run check` runs Vitest but not Playwright.
- Run `nub run test:e2e` when browser behavior, streaming, build output, or Playwright configuration changes.

## Vitest

- Vitest runs in ordinary Node.
- Colocate page tests under `src/pages/<page>/tests/` and service tests under `src/services/<service>/tests/`.
- Test public seams and real code paths.
- Drive HTTP behavior through `loadApp()` and its returned `fetch` function.
- `loadApp()` creates, migrates, and removes an isolated temporary SQLite database.
- Cancel SSE readers and dispose app handlers in cleanup-sensitive tests.
- Use service Layer overrides for page-level failure cases.
- Mock only outside the application boundary.
- Use `msw/node` for external HTTP.
- Use `TestClock` instead of real waits for Effect time.

## SQLite

- Use a new temporary database path per test scope.
- Apply migrations explicitly before building the normal application Layer.
- Cover missing and outdated schema startup failures.
- Cover scoped connection closure, migration idempotency, stored-row decoding, and persistence across application restarts.
- Never share the development `./data/app.db` with tests.

## Realtime

- Test the initial SSE patch.
- Open the stream before the command that publishes.
- Assert subscribe-before-write delivery and fresh durable rereads.
- Assert failed persistence does not publish.
- Cover pulse coalescing, multiple subscribers, reconnect, restart recovery, and cancellation cleanup.
- Commands persist and publish but do not patch the shared live region directly.

## Playwright

- Keep e2e offline and deterministic.
- Playwright uses port `8787` by default.
- `playwright.config.ts` creates a temporary database, runs `nub run build`, explicitly runs `nub run db:migrate`, and starts the compiled server.
- Prove real browser round trips: page load, action, Datastar request, SSE patch, and DOM update.
- Use multiple pages in one browser context for realtime convergence.
