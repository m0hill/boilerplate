# Effect

## Boundary

- Use Effect where nearby code uses Effect.
- Routes, request handling, services, schemas, failures, and resource wiring use Effect.
- Browser-only `src/client` code stays plain browser TypeScript.
- Pure helpers stay plain TypeScript.
- Avoid `async`/`await` and `try`/`catch` inside Effect workflows; convert promises and exceptions at external seams.
- Keep protocol rendering at HTTP boundaries; services should not construct raw `Response` objects.

## Composition

- Prefer `Effect.gen` for multi-step workflows.
- Avoid `Effect.Do` unless matching nearby code.
- Avoid nested `flatMap` or `andThen`; use `Effect.gen`.
- Use data-last dual APIs inside `.pipe(...)` chains.
- Use data-first dual APIs for one-off transforms when it is shorter.
- Keep the source effect visually first.
- Do not mix data-first and data-last in one chain.
- Use `.andThen` only for one-step sequencing when the previous value is not needed.

## Services

- Dependency-bearing modules use Services, Tags, and Layers.
- Prefer `yield* Service` from `Context.Service` inside Effect code.
- Do not thread dependency bags through long call chains.
- Layers own construction.
- Layers own config parsing.
- Layers own resource wiring.
- Domain operations receive dependencies through services.
- Adapt Cloudflare bindings into narrow services.
- Name layers by role: `Service.layer`, `Service.layerFromEnv`, `Service.layerMemory`. Avoid `Live`.

## Errors

- Expected failures stay in the typed error channel.
- Domain, parse, auth, persistence, dependency, and workflow failures are expected failures.
- Defects are bugs and startup misconfiguration.
- Use local tagged-error style.
- Prefer `Schema.TaggedErrorClass` across Effect or Schema boundaries.
- Catch or switch expected failures by tag.
- Keep feature error unions precise.
- Do not widen precise module errors to `unknown` at module boundaries.
- Handle broad app failures near orchestration, rendering, logging, or entrypoints.

## Matching

- Use `Effect.catchTag` or `Effect.catchTags` for tagged error recovery.
- Use `Effect.match` only when folding success and failure into a pure value.
- Use `Effect.matchEffect` when either fold branch returns an Effect.
- Use `Effect.matchCause*` only when Cause, defects, or interruption matter.
- Use `Option.match` for `Option`.
- Use `Match.value` or `Match.type` for value unions.
- Prefer `Match.tag` or `Match.typeTags` for `_tag` unions.
- Prefer `Match.exhaustive` over fallback defaults for closed unions.
- Plain `if` is fine for one branch.

## Schema

- Use Effect `Schema` at boundaries.
- Parse refined and branded domain values with Schema.
- Use `Schema.brand` when Schema owns validation.
- Use `Brand.nominal` only for nominal values without runtime validation.
- Do not export raw aliases like `type UserId = string`.
- Parse Datastar signals, params, bodies, external JSON, env, config, and runtime-hop payloads.
- Let parsed refined values flow inward.
- Use codecs when Effect owns both sides of a projection.

## Secrets

- Wrap secrets in `Redacted`.
- Unwrap only inside the external-system adapter.
- Keep raw secrets out of errors, logs, traces, metrics, snapshots, and HTML.

## Runtime values

- Use `Option` for internal absence in Effect code.
- Convert `null` and `undefined` at external seams.
- Use Effect `Clock` and DateTime APIs for time inside Effect workflows.

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
- Override `Clock.Clock` for deterministic time tests.
- Prefer schema-derived generated values.
- Property callbacks assert or return a failing Effect.
