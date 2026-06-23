# Autoresearch: professional Effect codebase refactor

## Objective

Turn this Cloudflare Worker + Datastar boilerplate into an idiomatic, professional Effect codebase rather than a Hono-shaped app with Effect wrapped around it. Preserve the hypermedia-first behavior: server-rendered TSX, Datastar signals/actions, SSE patches, and Workers-compatible runtime code.

The target is not raw speed. The target is Effect architecture quality with automated guardrails so experiments can be kept or reverted safely.

## Metrics

- **Primary**: `effect_audit_score` (unitless, lower is better) — static count of broad Effect anti-pattern signals in `src/` production code.
- **Secondary**:
  - `data_tagged_error` — uses of `Data.TaggedError`; prefer `Schema.TaggedErrorClass` for typed/schema-aware errors.
  - `effect_gen_factories` — functions returning `Effect.gen`; prefer named `Effect.fn("Name")` for effectful functions.
  - `untraced_effect_exports` — exported effectful functions not using `Effect.fn`/service methods.
  - `direct_platform_dependencies` — domain/page functions directly requiring platform services such as `HttpClient`; prefer cohesive services/layers when the capability is meaningful.
  - `effect_fn_calls` — informational count of named `Effect.fn` use.
  - `service_classes` — informational count of `Context.Service` use.
  - `src_lines` — production source size monitor.

## How to Run

`./autoresearch.sh` — prints `METRIC name=value` lines. `autoresearch.checks.sh` runs automatically after the metric and must pass before keeping a change.

## Files in Scope

- `src/server.tsx` — Worker entry, route-layer composition, Effect HTTP handler wiring.
- `src/cloudflare-env.ts` — Effect service for per-request Workers bindings.
- `src/http/*` — HTTP/Datastar boundary helpers.
- `src/pages/home/*` — GitHub repo lookup demo: form schemas, repo-name domain, GitHub HTTP capability service, compare-board domain, route handlers, views, tests.
- `src/pages/counter/*` — KV counter demo: KV capability, route handlers, views, tests.
- `src/pages/not-found.ts` — catch-all route.
- `src/ui/*` — shared TSX view helpers.
- `src/test-utils.ts` and colocated tests — test seams and expectations.
- Documentation files (`README.md`, `AGENTS.md`, `AGENTS.d/*`, ADRs) when durable architecture decisions change.

## Off Limits

- Do not edit `repos/` (vendored references are read-only).
- Do not introduce Node runtime APIs (`fs`, `process.env`, `@hono/node-server`) into Worker code.
- Do not replace Datastar hypermedia flows with client-side state.
- Do not weaken tests, remove meaningful assertions, or change the benchmark script merely to improve the metric.
- Do not add dependencies unless a clear architectural need emerges.

## Constraints

- Use `nub` for scripts and package operations.
- Route handlers remain Effect `HttpRouter` handlers returning `HttpServerResponse`.
- Wrap Datastar `reply.*` responses with `HttpServerResponse.raw(...)`.
- Validate untrusted signals at the boundary with Effect `Schema.decodeUnknownEffect`.
- Expected failures stay in the Effect error channel as tagged errors and surface as Datastar signal/element patches where user-fixable.
- Use Workers-pool Vitest seams (`app.fetch(request(...))`) and MSW only for external HTTP.
- `nub run check` must pass before keeping source changes.
- Keep code human-readable, linear, and cohesive; prefer deep modules/services over shallow wrappers.

## Reference Material Consulted

- `repos/effect/ai-docs/src/01_effect/01_basics/index.md`
- `repos/effect/ai-docs/src/01_effect/01_basics/02_effect-fn.ts`
- `repos/effect/ai-docs/src/01_effect/02_services/01_service.ts`
- `repos/effect/ai-docs/src/50_http-client/10_basics.ts`
- `repos/effect/ai-docs/src/51_http-server/10_basics.ts`
- `repos/effect/ai-docs/src/09_testing/20_layer-tests.ts`
- `anomalyco/opencode` via `opensrc`, especially `packages/core/src/repository-cache.ts` and `packages/core/src/effect/*` for service/layer organization.

## What's Been Tried

- Baseline pending.
