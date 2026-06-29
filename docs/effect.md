# Effect

## Boundary

- Use Effect where nearby code uses Effect.
- Routes, request handling, services, schemas, failures, and resource wiring use Effect.
- Browser-only `src/client` code does not need Effect.
- Tiny pure helpers do not need Effect.
- Do not add parallel DI, validation, or test frameworks inside Effect-owned code.

## Services

- Dependency-bearing modules use Services, Tags, and Layers.
- Do not use ad hoc dependency bags.
- Layers own construction.
- Layers own config parsing.
- Layers own resource wiring.
- Domain operations do not construct live production layers.
- Domain operations do not read raw env.
- Adapt Cloudflare bindings into narrow services.

## Errors

- Expected failures stay in the typed error channel.
- Domain, parse, auth, persistence, dependency, and workflow failures are expected failures.
- Use defects only for bugs and startup misconfiguration.
- Use local tagged-error style.
- Prefer `Schema.TaggedErrorClass` across Effect or Schema boundaries.
- Keep feature error unions precise.
- Handle broad app failures near orchestration, rendering, logging, or entrypoints.

## Schema

- Use Effect `Schema` at boundaries.
- Parse refined and branded domain values with Schema.
- Parse Datastar signals, params, bodies, external JSON, env, config, and runtime-hop payloads.
- Let parsed refined values flow inward.
- Do not parse and then use raw values.
- Use codecs when Effect owns both sides of a projection.

## Secrets

- Wrap secrets in `Redacted`.
- Unwrap only inside the external-system adapter.
- Never put raw secrets in errors, logs, traces, metrics, snapshots, or HTML.

## Lifecycle

- Layers acquire cleanup-requiring resources.
- Layers own cleanup.
- Shared test layers preserve teardown.
- Shared test layers do not leak mutable fixture state.

## Tests

- Use Effect-aware tests for Effect services and workflows.
- Use `it.effect` for effects under test services.
- Use `it.live` only for live runtime behavior.
- Use `layer(...)` or nested `it.layer(...)` for service tests.
- Prefer schema-derived generated values.
- Property callbacks must assert or return a failing Effect.
- Returning `false` from a succeeding Effect is not a failure.
- Check installed Effect versions before copying examples.
- Keep Effect testing packages version-aligned with `effect`.

## Reject

- Effect everywhere just because Effect exists.
- Expected failures as defects.
- Dependency bags instead of Services.
- Parsing followed by raw input use.
