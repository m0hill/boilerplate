# Vendored Repos

- `repos/` is read-only reference material.
- Never edit, format, regenerate, or include `repos/` in application audits.
- Use `repos/datastar-kit` for Datastar Kit helpers, JSX, signals, patches, streams, `read`, `reply`, and request/response patterns.
- Use `repos/effect` for Effect APIs, tests, Node platform patterns, and package conventions.
- Application code imports installed package dependencies instead of vendored source.
