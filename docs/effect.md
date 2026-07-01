# Effect

## Boundary

- Use Effect where nearby code uses Effect.
- Routes, request handling, services, schemas, failures, and resource wiring use Effect.
- Browser-only `src/client` code stays plain browser TypeScript.
- Pure helpers stay plain TypeScript.
- Avoid `async`/`await` and `try`/`catch` inside Effect workflows; convert promises and exceptions at external seams.
- Keep protocol rendering at HTTP boundaries; services should not construct raw `Response` objects.
- Promise APIs use `Effect.runPromise` at the seam.
- Durable Object RPC methods and `blockConcurrencyWhile` callbacks are seams.
- Keep Durable Object RPC values structured-clone-safe.

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
- Avoid `Context.getUnsafe`.
- Middleware fiber-context reads use `Context.getOption`.
- Missing framework services are defects.
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
- Stored or external decode failures map to `invalid_row` or `invalid_value`.
- Defaults mean absence, not corruption.
- In `Effect.gen`, expected failures use `yield* Effect.fail(...)`.

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
- Stored or external timestamps entering domain use `Schema.DateTimeUtcFrom*`.
- Convert `DateTime` and Effect runtime objects at Durable Object RPC seams.
- Nullable boundary fields become `Option` with `Schema.OptionFrom*`.
- Services expose `Option`, not `Schema.NullOr`, unless `null` is domain.
- Use `Schema.decodeUnknownEffect` when parse errors matter.
- Use `Schema.decodeUnknownOption` only when invalid means absent.

## Secrets

- Wrap secrets in `Redacted`.
- Unwrap only inside the external-system adapter.
- Keep raw secrets out of errors, logs, traces, metrics, snapshots, and HTML.

## Runtime values

- Use `Option` for internal absence in Effect code.
- Convert `null` and `undefined` at external seams.
- Use Effect `Clock` and DateTime APIs for time inside Effect workflows.
- Server TSX uses `Option`, not optional props, for real empty states.
- Format Effect-owned timestamps with `DateTime.format*`.
- Plain `Date` stays at platform edges.
- Match Effect data types through module matchers.
- Use `Exit.match`, not `_tag`.
- Recovered outcomes use `Effect.result(...)` and `Result.match`.
- Use `Duration` for intervals, timeouts, TTLs, and elapsed time.
- Convert `Duration` only at numeric API seams.
- Use `DateTime.now` and `DateTime.distance` for wall-clock spans.
- Use `BigDecimal` only for exact decimal math.
- Use `HashSet` only for set algebra.
- Use `Chunk` only for collection-heavy immutable Effect code.

## Lifecycle

- Layers acquire cleanup-requiring resources.
- Layers own cleanup.
- Shared test layers preserve teardown.
- Shared test layers isolate mutable fixture state.
- Throwable initialization uses `Effect.sync` or `Effect.try`.
- Synchronous host seams use `Effect.runSync`.
- Promise or async host seams use `Effect.runPromise`.
- Never wrap sync init in `Effect.runPromise(Effect.sync(...))`.
- Never hide init failures in `async` callbacks.

## Tests

- Use Effect-aware tests for Effect services and workflows.
- Use `it.effect` for effects under test services.
- Use `it.live` for live runtime behavior.
- Use `layer(...)` or nested `it.layer(...)` for service tests.
- Use `TestClock.adjust(...)` for Effect time tests.
- Fork sleeping or recurring effects before adjusting `TestClock`.
- Prefer schema-derived generated values.
- Property callbacks assert or return a failing Effect.
- Parse unknown test payloads with Schema, not ad hoc guards or `JSON.parse` blocks.
