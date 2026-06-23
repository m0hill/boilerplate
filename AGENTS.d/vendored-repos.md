# Vendored repositories guide

This project vendors external repositories under `repos/`.

## Datastar Kit

- Use `repos/datastar-kit` as read-only reference material when writing Datastar Kit code.
- Inspect its source, tests, examples, and docs for idiomatic Datastar authoring helpers, `read`,
  `reply`, JSX, signals, patches, streams, and Request/Response patterns.
- Prefer patterns from the vendored source over generated guesses or web search.

## Effect

- Use `repos/effect` as read-only reference material when writing or reviewing Effect-based code.
- Start with `repos/effect/packages/effect/src` and `repos/effect/packages/effect/test` for core
  APIs, then inspect package-specific sources/tests such as `platform`, `platform-browser`, `rpc`,
  `sql`, or `vitest` only when that package is relevant.

## Rules

- Do not edit files under `repos/` unless explicitly asked.
- Do not import from `repos/`; application code should import from package dependencies.
