# Effect

## Boundary

- Use Effect where nearby code uses Effect.
- Routes, request handling, services, schemas, failures, and resource wiring use Effect.
- Browser-only `src/client` code stays plain browser TypeScript.
- Pure helpers stay plain TypeScript.

## Services

- Dependency-bearing modules use Services, Tags, and Layers.
- Layers own construction.
- Layers own config parsing.
- Layers own resource wiring.
- Domain operations receive dependencies through services.
- Adapt Cloudflare bindings into narrow services.

## Errors

- Expected failures stay in the typed error channel.
- Domain, parse, auth, persistence, dependency, and workflow failures are expected failures.
- Defects are bugs and startup misconfiguration.
- Use local tagged-error style.
- Prefer `Schema.TaggedErrorClass` across Effect or Schema boundaries.
- Keep feature error unions precise.
- Handle broad app failures near orchestration, rendering, logging, or entrypoints.

## Schema

- Use Effect `Schema` at boundaries.
- Parse refined and branded domain values with Schema.
- Parse Datastar signals, params, bodies, external JSON, env, config, and runtime-hop payloads.
- Let parsed refined values flow inward.
- Use codecs when Effect owns both sides of a projection.

## Secrets

- Wrap secrets in `Redacted`.
- Unwrap only inside the external-system adapter.
- Keep raw secrets out of errors, logs, traces, metrics, snapshots, and HTML.

## Lifecycle

- Layers acquire cleanup-requiring resources.
- Layers own cleanup.
- Shared test layers preserve teardown.
- Shared test layers isolate mutable fixture state.

## Tests

- Use Effect-aware tests for Effect services and workflows.
- Use `it.effect` for effects under test services.
- Use `it.live` for live runtime behavior.
- Use `layer(...)` or nested `it.layer(...)` for service tests.
- Prefer schema-derived generated values.
- Property callbacks assert or return a failing Effect.
