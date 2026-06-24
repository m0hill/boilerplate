# Vendored repositories guide

External repositories live under `repos/` as read-only reference material.

- Use `repos/datastar-kit` when checking Datastar Kit helpers, JSX, signals, patches, streams,
  `read`, `reply`, and Request/Response patterns.
- Use `repos/effect` when checking Effect APIs, tests, and package-specific patterns.
- Do not edit files under `repos/` unless explicitly asked.
- Do not import from `repos/`; application code imports package dependencies.
