# Testing and TDD guide

Loosely follows [Artem Zakharchenko](https://www.epicweb.dev/contributors/artem-zakharchenko)
(MSW creator). The aim: tests that fail **only** when the intent of the system is broken.

## TDD workflow for feature/bug work

- Start by naming the public behavior in product terms. If the interface or priority is unclear,
  ask first: _what should the public interface look like, and which behaviors matter most?_
- Avoid horizontal slicing. Do **not** write all tests first and then all implementation. Work in
  vertical tracer bullets: one failing test → minimal implementation → passing test → next behavior.
- Keep each RED honest: the test should fail for the missing behavior, not because of setup noise,
  snapshots, or guessed implementation shape.
- Keep each GREEN minimal: write only enough code to satisfy the current behavior. Do not anticipate
  future cases or add speculative flags/options.
- Refactor only while green. After tests pass, remove duplication, deepen modules, improve names,
  and run the focused tests after each refactor step.
- You can't test everything. Prioritize critical paths, error states, parsing boundaries, and logic
  that would be expensive or scary to verify manually.

## Test shape

- **Test intention, not implementation.** Drive the app through its real boundary —
  `app.fetch(request("/..."))` — and assert on the response a user would receive (rendered HTML,
  SSE patches, status, signals). Don't reach into internal state or private helpers.
- **Colocate tests** next to the code (`foo.tsx` → `foo.test.ts`; `foo.e2e.ts` for browser flows),
  not in a separate tree.
- **Name tests as capabilities.** A good test reads like a specification: "looks up a repo and
  patches the star count", not "calls fetchRepoStars".
- **Use executable scenarios for repeated behavior.** When a feature has several variants, write the
  cases as small given/when/expect scenarios near the feature/page. Each scenario needs a human
  description, deterministic inputs, and assertions on observable output. If the scenario shape
  repeats, extract a tiny colocated test helper that still drives the public seam.
- **Assert meaningful output.** Prefer specific HTML/SSE/status/copy assertions over large snapshots
  or brittle implementation details.
- **Use the right seam.** Server/hypermedia behavior uses Workers-pool Vitest through `app.fetch`.
  Browser-only behavior (Datastar DOM updates, client islands, focus/keyboard behavior) uses
  Playwright against `wrangler dev`. Pure domain modules use focused colocated tests through their
  exported parsers/smart constructors/functions.

## Mocking and determinism

- **Don't over-mock.** Run the app for real; mock only what's _outside_ the boundary: external HTTP,
  side effects, and non-deterministic values (time, random).
- **No module mocking for app code.** Avoid `vi.mock` for internal modules. Prefer real seams,
  constructor-injected interfaces, in-memory/local adapters, MSW, or deterministic inputs.
- **Don't assert on outgoing requests** as the main result — assert on the resulting outcome. For
  external HTTP, intercept at the network with **MSW** (`@msw/cloudflare`'s `setupNetwork`): validate
  the payload _inside_ the handler when needed and let a wrong request surface as a failed outcome
  assertion. See `src/pages/home/home.test.ts`: it mocks GitHub and tests the real `/lookup` route.
- **Trust Vitest's defaults** (isolated files, parallel execution, explicit imports over `globals`).
  Keep `vitest.config.ts` minimal. Prefer `.resolves`/`.rejects` chaining.
- **Real browser over JSDOM** for client-side behavior: colocated `*.e2e.ts` Playwright specs drive
  a real browser against `wrangler dev` (`nub run test:e2e`; install the browser once with
  `nubx playwright install chromium`). Keep e2e offline/deterministic — cover external-dependent
  happy paths in the MSW-mocked Workers-pool tests, and use e2e for the client round-trip (form →
  SSE patch → DOM).
