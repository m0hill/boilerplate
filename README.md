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

## Database

- Drizzle schema lives in `src/db/schema.ts`.
- Generate migrations with `nub run db:generate`.
- Apply local D1 migrations with `nub run db:migrate:local`.
- For remote Drizzle Kit commands, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN`.

## Before deploying

- Run `wrangler kv namespace create COUNTER_KV` and paste the returned KV id into `wrangler.jsonc`.
- Run `wrangler d1 create boilerplate` and paste the returned D1 `database_id` into `wrangler.jsonc`.
- Run `nub run db:migrate:remote` after generating migrations.
- Run `nub run cf-typegen` after changing Worker bindings.
- Deploy with `nub run deploy`.

See `AGENTS.md` for project structure, testing rules, styling, and code conventions.
