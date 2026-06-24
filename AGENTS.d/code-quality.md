# Code quality guide

Follow nearby code first. These rules cover project-specific boundaries that are easy to miss.

## Runtime boundaries

- App code runs on Cloudflare Workers. Keep Node-only APIs out of Worker modules.
- `src/client` is browser-only. It must not import Worker routes, page modules, Cloudflare
  bindings, persistence adapters, or server capabilities.
- Bindings enter through `src/server.tsx`. Adapt them into narrow services before passing them to
  page/domain code unless a feature truly needs the raw Worker env.

## TypeScript and domain rules

- Keep strict TypeScript clean: no `any`, no non-null assertions, no `as Type` casts. Prefer
  parsing, narrowing, and derived types. `as const` is fine.
- Parse untrusted data once at the boundary: Datastar signals, params, request bodies, external
  JSON, env/config, and Worker bindings.
- Keep parsed domain values inside the feature. Do not pass raw DTOs, `unknown`, or `Partial<T>`
  through core logic.
- Expected failures should be typed values in the Effect error channel. Throw/reject only for
  defects or startup misconfiguration.
- Derive shapes from schemas, services, or existing values where practical instead of duplicating
  interfaces.

## Module shape

- Keep feature code under `src/pages/<name>/`: routes in `<name>.tsx`, TSX in `views.tsx`, external
  capabilities in focused modules, and pure domain rules in focused modules.
- Split a file only when it stops being clear. Avoid catch-all `utils`, `helpers`, and shallow
  wrappers.
- Export only what other modules need. Avoid barrel files unless they solve a real import problem.
- Keep I/O, parsing, time/randomness, telemetry, and framework glue at the boundary; keep domain
  rules pure where possible.
