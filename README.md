# boilerplate

Cloudflare Workers + Alchemy + Effect + Datastar + datastar-kit starter for hypermedia-driven TypeScript apps.

## Start a new project

```sh
curl -fsSL https://raw.githubusercontent.com/m0hill/boilerplate/main/scripts/boilerplate.sh | bash -s -- my-app
```

## Work locally

```sh
nub install
nub run dev # first run prompts for Alchemy/Cloudflare auth and state-store bootstrap
nub run check
```

## Demos

The landing page (`/`) is an index of self-contained demos. Each one shows a single capability.
Pages live under `src/pages/<page>/`; Cloudflare resource-bound capabilities live under
`src/resources/<resource>/`; external services live under `src/services/<service>/`.

| Route            | Capability                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| `/kv`            | Counter persisted in Workers KV, incremented server-side in Effect.           |
| `/d1`            | The same counter on D1 (SQLite) via Drizzle, rows parsed by Schema.           |
| `/r2`            | Save, list, open, and delete text objects in an R2 bucket.                    |
| `/do`            | Per-room chat — one Durable Object owns SQLite, writes, and live pulses.      |
| `/live-counter`  | D1-backed counter synced through a payload-free Durable Object pulse hub.     |
| `/api`           | GitHub lookup with Effect `HttpClient` + `Schema`, mocked with MSW.           |
| `/web-component` | Browser-only logic via a `<qr-code>` custom element fed by a Datastar signal. |

## Realtime pattern

Live views use Datastar's invalidation + re-read shape:

1. Open the pulse subscription before the first read.
2. Render current backend state as the first SSE patch.
3. Commands mutate the source of truth and publish a payload-free `changed` pulse.
4. Each pulse makes the stream re-read current state and render the same view again.

This works whether a Durable Object owns the database (`/do`) or only acts as an invalidation hub for
another store (`/live-counter`). The event stream never carries the source-of-truth payload, so
reconnects recover by rendering current state and out-of-order events cannot revert the UI.

Reusable pieces live in `src/lib/realtime/pulse.ts` and `src/lib/realtime/live-view.ts`.

## Database

- D1 schema lives in `src/resources/d1/schema.ts`; generate with `nub run db:generate` (output in
  `migrations/drizzle/`). Alchemy applies pending D1 migrations from `alchemy.run.ts` during
  `alchemy dev` and `alchemy deploy`.
- Durable Object SQLite schema lives in `src/resources/chat-room/schema.ts`; generate with
  `nub run db:generate:do` (output in `migrations/drizzle-do/`). DO migrations run automatically
  inside the object on first wake — no apply step.
- For Drizzle Kit commands that talk directly to remote D1, set `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN`.

## Before deploying

- Run `alchemy login --configure` if you want to choose a Cloudflare profile up front; otherwise the
  first Alchemy command prompts interactively.
- Review `alchemy.run.ts` for the Worker, KV, D1, R2, Durable Object, assets, and observability
  configuration.
- Deploy with `nub run deploy`. Alchemy creates or adopts the Cloudflare resources and applies D1
  migrations.

See `AGENTS.md` for project structure, testing rules, styling, and code conventions.
