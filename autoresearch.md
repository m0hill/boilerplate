# Autoresearch: professional Effect codebase refactor

## Objective

Turn this Cloudflare Worker + Datastar boilerplate into an idiomatic, professional Effect codebase rather than a Hono-shaped app with Effect wrapped around it. Preserve the hypermedia-first behavior: server-rendered TSX, Datastar signals/actions, SSE patches, and Workers-compatible runtime code.

The target is not raw speed. The target is Effect architecture quality with automated guardrails so experiments can be kept or reverted safely.

## Metrics

- **Primary (phase 6)**: `binding_docs_staleness_score` (unitless, lower is better) — docs/comments that still describe handlers reading `COUNTER_KV` directly through `CloudflareEnv` instead of the current request-scoped `CounterStore` adapter.
- **Secondary**:
  - `stale_binding_docs` — stale Worker binding examples/comments.
  - `docs_staleness_score` — phase 5 Datastar docs score; should stay at zero.
  - `stale_datastar_docs` — docs that tell route authors to call `HttpServerResponse.raw(...)` directly instead of the shared Datastar HTTP helpers.
  - `domain_schema_score` — phase 4 schema-backed domain model score; should stay at zero.
  - `plain_exported_domain_types` — `export type PascalCase = { ... }` domain records crossing module boundaries.
  - `error_model_score` — phase 3 structured error score; should stay at zero.
  - `string_reason_errors` — tagged errors whose reason is any string instead of a closed union/structured fields.
  - `status_string_reasons` — status codes encoded into a reason string rather than a numeric field.
  - `route_noise_score` — phase 2 route readability score; should stay at zero.
  - `raw_datastar_wrappers` — `HttpServerResponse.raw(...)` call sites that should usually be centralized in the Datastar HTTP boundary.
  - `route_effect_constants` — route-level `Effect.gen(function*)` constants; prefer named `Effect.fn(...)` when the effect represents a handler/workflow and benefits from tracing.
  - `effect_audit_score` — phase 1 coarse Effect anti-pattern score; should stay at zero.
  - `data_tagged_error` — uses of `Data.TaggedError`; prefer `Schema.TaggedErrorClass` for typed/schema-aware errors.
  - `effect_gen_factories` — functions returning `Effect.gen`; prefer named `Effect.fn("Name")` for effectful functions.
  - `untraced_effect_exports` — exported effectful functions not using `Effect.fn`/service methods.
  - `direct_platform_dependencies` — route/domain helpers directly requiring platform services such as `HttpClient`; service/layer modules are the intended adapter boundary.
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
- Return Datastar responses from route handlers through `src/http/datastar.ts` helpers.
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

- Baseline audit found Effect code shaped around old handlers: `Data.TaggedError`, anonymous
  `Effect.gen` factories, direct `HttpClient`/`CloudflareEnv` use, and shallow repo helpers.
- Kept: converted production errors to `Schema.TaggedErrorClass` and effectful helpers to named
  `Effect.fn(...)`; behavior stayed green under `nub run check`.
- Kept: introduced `GitHubRepos` and `CounterStore` services so routes depend on capabilities.
  `GitHubReposLive` is composed with `FetchHttpClient` at the app boundary; `CounterStore` is
  adapted from `COUNTER_KV` in the Worker `fetch` boundary.
- Kept: removed the pass-through `repos.ts` helper and moved multi-repo fetch into
  `GitHubRepos.fetchMany`; removed the one-use `parseRepoNames` helper.
- The audit script was refined after those refactors so direct platform lookup is only counted when
  it appears outside `Context.Service` modules; service/layer implementations are the intended
  adapter boundary.
- Kept: centralized Datastar `reply.*` → `HttpServerResponse.raw(...)` wrapping in `src/http/datastar.ts`
  and named the remaining route handler effects with `Effect.fn(...)`, bringing `route_noise_score`
  to zero.
- Kept: changed `GitHubUnavailableError` to a closed reason union plus an optional numeric status,
  bringing `error_model_score` to zero.
- Kept: changed `Repo` and `RepoName` into `Schema.Class` domain models, bringing
  `domain_schema_score` to zero.
- Kept: updated AGENTS docs to point route authors at Datastar response helpers, bringing
  `docs_staleness_score` to zero.
- Phase 6 now targets stale Worker binding docs/comments that still describe handlers reading
  `COUNTER_KV` directly from `CloudflareEnv` instead of using request-scoped services.
