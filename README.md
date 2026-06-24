# boilerplate

Cloudflare Workers + Effect + Datastar + datastar-kit starter for hypermedia-driven TypeScript apps.

## Start a new project

```sh
curl -fsSL https://raw.githubusercontent.com/m0hill/boilerplate/main/scripts/boilerplate.sh | bash -s -- my-app
```

## Work locally

```sh
nub install
nub run dev
nub run check
```

## Before deploying

- Update `wrangler.jsonc` for bindings.
- Run `nub run cf-typegen` after changing Worker bindings.
- Deploy with `nub run deploy`.

See `AGENTS.md` for project structure, testing rules, styling, and code conventions.
