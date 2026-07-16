# Effect

## Boundary

- Routes, request handling, services, schemas, failures, configuration, and resource wiring use Effect.
- Browser-only `src/client` code stays plain browser TypeScript.
- Pure synchronous helpers with no dependencies or expected failures stay plain TypeScript.
- Convert promises and thrown platform errors to Effect at external seams.
- Keep protocol rendering at HTTP boundaries.
- Use `NodeRuntime.runMain` only at executable entrypoints.

## Composition

- Prefer `Effect.gen` for multi-step workflows.
- Avoid nested `flatMap`; keep the source effect visually first in pipelines.
- Use `.andThen` only for one-step sequencing when the previous value is not needed.
- Build route and service Layers at `src/app.tsx` or another explicit composition root.

## Services And Configuration

- Dependency-bearing modules use Services, Tags, and Layers.
- Prefer `yield* Service` inside Effect code.
- Layers own construction, configuration parsing, and cleanup.
- Do not thread dependency bags through call chains.
- Name layers by role: `layer`, `layerFromConfig`, or `layerMemory`.
- Parse `HOST`, `PORT`, and `DATABASE_PATH` once through `ServerConfig`.
- Actual environment values override optional `.env` fallback values.
- Application modules do not read `process.env` directly.

## Errors

- Expected parse, persistence, dependency, and workflow failures stay in the typed error channel.
- Use local `Schema.TaggedErrorClass` style.
- Catch expected failures by tag.
- Keep module error unions precise.
- Treat malformed startup configuration and violated internal invariants as startup failures or defects.
- Keep causes and messages useful without leaking secrets.

## Schema

- Use Effect `Schema` at untrusted, environment, external API, and database boundaries.
- Let parsed and refined values flow inward.
- Convert nullable boundary fields to `Option` when absence is part of the domain.
- Decode stored rows before returning them from persistence services.

## Lifecycle

- Acquire cleanup-requiring resources with scoped Layers or `Effect.acquireRelease`.
- The SQLite Layer owns connection closure.
- The Node HTTP Layer owns server closure.
- The realtime Layer owns PubSub shutdown and stream subscriptions.
- `NodeRuntime.runMain` owns process signal interruption for the executable server.
- Test helpers must expose or register disposal for built Layers and open streams.

## Realtime

- Keep SQLite as truth and PubSub payload-free.
- Subscribe before the initial read.
- Re-read persistence after every pulse.
- Ensure HTTP response cancellation interrupts the Effect stream scope.
- Keep the application Layer shared so open requests use one PubSub instance.

## Tests

- Use Effect-aware tests for Effect services and workflows.
- Use real Layers and temporary SQLite databases for persistence behavior.
- Use `TestClock` for Effect time.
- Test observable service and HTTP behavior rather than private implementation shapes.
