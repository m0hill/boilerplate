# boilerplate

Cloudflare Workers + Effect + Datastar + datastar-kit starter for hypermedia-driven TypeScript apps.

## Start a new project

```sh
curl -fsSL https://raw.githubusercontent.com/m0hill/boilerplate/main/scripts/boilerplate.sh | bash -s -- my-app
```

## Work locally

```sh
nub install
nub run db:migrate:local # first run, and after adding Drizzle migrations
nub run dev
nub run check
```

## Demos

The landing page (`/`) is an index of self-contained demos. Each one shows a single capability and
links to the files that implement it — copy a folder under `src/pages/` to start your own.

| Route     | Capability                                                          |
| --------- | ------------------------------------------------------------------- |
| `/kv`     | Counter persisted in Workers KV, incremented server-side in Effect. |
| `/d1`     | The same counter on D1 (SQLite) via Drizzle, rows parsed by Schema. |
| `/r2`     | Save, list, open, and delete text objects in an R2 bucket.          |
| `/api`    | GitHub lookup with Effect `HttpClient` + `Schema`, mocked with MSW. |
| `/island` | Browser-only client island (a QR generator) bundled by esbuild.     |

## Database

- Drizzle schema lives in `src/db/schema.ts`.
- Generate migrations with `nub run db:generate`.
- Apply local D1 migrations with `nub run db:migrate:local`.
- For remote Drizzle Kit commands, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN`.

## Before deploying

- Run `wrangler kv namespace create COUNTER_KV` and paste the returned KV id into `wrangler.jsonc`.
- Run `wrangler d1 create boilerplate` and paste the returned D1 `database_id` into `wrangler.jsonc`.
- Run `nub run db:migrate:remote` after generating migrations.
- Run `wrangler r2 bucket create boilerplate` to create the R2 bucket.
- Run `nub run cf-typegen` after changing Worker bindings.
- Deploy with `nub run deploy`.

See `AGENTS.md` for project structure, testing rules, styling, and code conventions.
