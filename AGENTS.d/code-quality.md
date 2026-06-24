# Code quality guide

## Conventions

- App is hypermedia-driven: render TSX on the server, return `reply.page(...)` for full documents
  and `reply.patch(...)` for focused updates. Avoid client-side state where a server patch works.
- `jsxImportSource` is `datastar-kit` (see `tsconfig.json`) — JSX compiles to datastar-kit, not React.
- Validate untrusted input (signals, params) with an Effect `Schema` (`Schema.decodeUnknownEffect`);
  surface failures as signal patches (`reply.signals(...)` or `event.signals(...)`) rather than
  throwing.
- Client islands must stay browser-only: do not import worker/server modules, router/route wiring,
  Cloudflare bindings, page modules, or persistence adapters into `src/client`. If that boundary
  becomes hard to review manually, add a small lint script instead of relying on convention.
- If product vocabulary becomes non-trivial, add/update `CONTEXT.md` with a glossary and use that
  language in routes, tests, errors, and documentation.
- No semicolons (oxfmt config). Strict TypeScript is on.

## Code quality

Follow existing project conventions first; if none exist, follow these. Prefer small local
improvements over broad rewrites. When rules conflict, prioritize correctness, safety, and
debuggability.

**Parse at the boundary, keep domain types inside.**

- Parse untrusted input once at the edge: `unknown -> DTO -> domain type`. Don't sprinkle ad-hoc
  validation through core logic, and don't pass raw DTOs/IDs/`Partial<T>` into it.
- Parse env/config once at startup into typed config. Don't read `process.env` throughout the app.

**Make invalid states unrepresentable.**

- Brand meaningful primitives (IDs, emails, money, durations) and build them only through
  parsers/smart constructors.
- Prefer discriminated unions over boolean flag bags + nullable fields. Model lifecycles as tagged
  unions/state machines. Avoid behavior-controlling boolean params; use named options.

**Let types flow from the source of truth.** Derive (`Pick`, `Omit`, `ReturnType`, `typeof`,
indexed access) instead of restating shapes. Don't duplicate existing entities as new interfaces.

**Order each file the same way.** Read top-to-bottom as: imports → constants → schema/types →
errors → internal helpers → the module's public surface (its functions, service, components, or
routes). Because declarations are `const` bindings, this also keeps definitions before their uses.
In a file with several sections, mark them with a one-line comment (`// Constants`, `// Schema`,
`// Errors`, `// Helpers`, `// Routes`, …) — like the section headers in the vendored Effect source.
Group by kind, not by feature: e.g. all route handlers sit together under `// Routes`, with the
response/decoding helpers they call defined above under `// Helpers`. Skip the headers in
single-purpose files where the order is already obvious.

**TypeScript safety.** No `any`, no non-null `!`, no `as Type` casts (`as const` is fine) — branch,
parse, or refine instead. Rare unavoidable casts get a `SAFETY:` comment. Use `import type`. Prefer
`readonly`/`ReadonlyArray`. Prefer precise file names (`email-address.ts`) over `utils.ts`. Avoid
barrel files; export only what callers need. JSDoc exported APIs; comment invariants, not obvious code.

**Model expected failures as values, not exceptions.** Domain/parsing/auth/IO/persistence failures
go in the return type (a tagged `Result`/the project's error pattern), not a rejected promise.
Throw/reject only for unrecoverable defects (violated invariants, impossible branches, startup
misconfig, `notYetImplemented`). Keep error unions precise at module boundaries.

**Deep modules, functional core / imperative shell.** Pure domain logic inside; I/O, parsing,
telemetry, time/randomness, framework glue at the boundary. Deletion test: a module worth keeping
spreads complexity across callers when removed; a pass-through wrapper makes complexity vanish.
Avoid shallow wrappers and vague `Manager`/`Helper`/`Processor` names. Inject dependencies (clock,
randomness, adapters); avoid mutable singletons and import-time I/O outside entrypoints.

**Keep runtime checks meaningful.** Validate at real boundaries (user input, network, JSON,
external APIs). Remove internal checks that only compensate for weak types or duplicate a guarantee
the type system already gives.

**Observability & secrets.** Prefer structured tracing/spans over print logging; include safe
diagnostic fields (domain IDs, operation names, error tags). Never put secrets in errors/logs/
traces/fixtures; wrap credentials in a `Redacted<T>` and unwrap only where needed.

**Document durable decisions.** If a change creates a new architectural rule — persistence adapter,
auth model, background job/reaction model, client/server boundary, or test harness — add a short ADR
under `docs/adr/` and update `AGENTS.md`/`CONTEXT.md` so future humans and agents inherit the rule.

**Tests through real seams.** No module mocking (`vi.mock`); use constructor-injected interfaces,
in-memory/local adapters, or local DBs. Assert observable behavior; don't bypass parsers or
invariants in tests. See `AGENTS.d/testing.md` for the testing workflow.
