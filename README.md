# boilerplate

Cloudflare Workers + Alchemy + Effect + Datastar + datastar-kit starter for hypermedia-driven TypeScript apps.

## Start A New Project

```sh
curl -fsSL https://raw.githubusercontent.com/m0hill/boilerplate/main/scripts/boilerplate.sh | bash -s -- my-app
```

## Run Locally

```sh
nub install
nub run dev
nub run check
```

First `alchemy` run prompts for Cloudflare auth and state-store setup.

Open `http://localhost:8787`.

## Demos

The landing page links to these routes:

| Route            | Shows                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| `/kv`            | Workers KV counter.                                                    |
| `/d1`            | D1 counter with Drizzle rows parsed by Schema.                         |
| `/r2`            | R2 text object save, list, open, delete.                               |
| `/do`            | Per-room chat with Durable Object SQLite and live pulses.              |
| `/live-counter`  | D1 counter synced through a Durable Object invalidation hub.           |
| `/api`           | GitHub lookup with an Effect service, Schema, and MSW-backed tests.    |
| `/web-component` | Browser-only `<qr-code>` custom element fed by Datastar-bound signals. |

## More

- `AGENTS.md` — agent entry point.
- `docs/` — architecture, Alchemy, Effect, Drizzle, testing, styling, and conventions.
