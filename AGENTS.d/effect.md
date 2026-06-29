# Effect guide

This project uses Effect intentionally. Keep new code aligned with the local Effect architecture rather than adding parallel patterns.

## Adoption boundary

- Use Effect for Worker routes, request handling, services, schemas, typed failures, and resource wiring where the surrounding code already uses it.
- Do not force Effect into browser-only `src/client` code or tiny pure helpers that do not need Effect semantics.
- Do not introduce parallel constructor-injection, validation, or testing frameworks inside an Effect responsibility without a concrete interoperability reason.

## Services, Tags, and Layers

- Dependency-bearing modules use Effect Services/Tags/Layers, not ad hoc dependency bags.
- Layers or the composition root own construction, config parsing, and resource wiring.
- Domain operations should not construct live production layers, read raw env, or wire resources as part of ordinary business logic.
- Keep raw Cloudflare bindings at `src/server.tsx` or focused external adapter seams; adapt them into narrow services before page/domain code uses them.

## Typed errors

- Expected failures belong in Effect's typed error channel.
- Do not turn domain, parse, authorization, persistence, dependency, or workflow failures into unchecked defects.
- Use the project's established tagged-error style for custom errors, preferably `Schema.TaggedErrorClass` when the error crosses an Effect/schema boundary.
- Keep error unions precise inside feature/service modules. Broader app-level failure handling belongs near orchestration, rendering, logging, and entrypoints.

## Schema and parsing

- Use Effect `Schema` for boundary parsing, refined/branded domain values, external JSON, Datastar signals, request params/bodies, env/config, and storage/runtime-hop payloads.
- A successful parse must produce the refined value that flows inward. Do not parse and then continue using raw input.
- When Effect owns both sides of a codec/projection, prefer Effect Schema codecs over hand-written duplicate DTO logic.

## Secrets and redaction

- Tokens, credentials, API keys, passwords, and other secrets should use Effect's `Redacted` value type in Effect code.
- Wrap secrets at the boundary and unwrap only inside the adapter that must call the external system.
- Never include raw secrets in errors, logs, traces, metrics, snapshots, or rendered output.

## Resource lifecycle

- Layers that acquire cleanup-requiring resources also own cleanup.
- Keep acquisition/cleanup in Layers or composition roots, not scattered through domain operations.
- Shared/scoped test layers must preserve managed teardown and must not leak mutable fixture state between tests.

## Testing Effect code

- Prefer Effect-aware tests for Effect services and workflows.
- Use `it.effect` for effects under test services.
- Use `it.live` only when intentionally verifying live runtime behavior.
- Use `layer(...)` / nested `it.layer(...)` for service tests with managed teardown.
- Use schema-derived generated values where practical instead of duplicating arbitrary factories.
- Property callbacks must assert or return a failing Effect when false; merely returning `false` from a succeeding Effect is not enough.

## Version-specific guidance

- Check installed Effect package versions before copying version-specific examples from docs or other repos.
- Keep Effect testing packages version-aligned with `effect` when the project uses them.

## Rejected patterns

- "Effect exists somewhere, so every new line of code must use Effect."
- "Effect lets expected failures die."
- "Any Layer shape is fine."
- "Parsing is enough even if raw input keeps flowing inward."
- "A dependency bag is equivalent to a Service/Tag/Layer."
