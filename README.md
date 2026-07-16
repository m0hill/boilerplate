# boilerplate

Node 24 + Effect + Datastar Kit + Tailwind + Drizzle + SQLite starter for hypermedia-driven TypeScript apps.

## Start A New Project

Install Node 24+, [`nub`](https://www.npmjs.com/package/nub), Git, and Perl. Then run:

```sh
curl -fsSL https://raw.githubusercontent.com/m0hill/boilerplate/node/scripts/boilerplate.sh | bash -s -- my-app
cd my-app
nub run db:migrate
nub run dev
```

The generator clones the upstream `node` branch, removes the template history, installs dependencies, and initializes the generated project on its own `main` branch.

Open `http://localhost:3000`.

## Run This Checkout

```sh
nub install
cp .env.example .env
nub run db:migrate
nub run dev
```

`.env` is optional. Actual environment variables override values from `.env`. Defaults are `HOST=0.0.0.0`, `PORT=3000`, and `DATABASE_PATH=./data/app.db`.

Migrations are explicit: `nub run db:migrate` applies them, while server startup only validates that the schema is current. Use `nub run db:generate` after changing `src/services/sqlite/schema.ts`.

## Production

```sh
nub run db:migrate
nub run build
nub run start
```

The build emits the Node ESM server at `dist/server.js` and static assets under `dist/public`. Production startup requires the built output and production dependencies.

SQLite uses Node's synchronous built-in `node:sqlite` driver. It is a portable default for a single Node process, but long queries block that process's event loop. Keep persistence behind the existing service boundary if the application needs a different database.

The realtime example stores truth in SQLite and uses application-scoped Effect PubSub only for payload-free invalidation. Open tabs connected to one server process converge; multiple processes or replicas require an external coordination mechanism that this starter does not provide.

## Demos

| Route            | Shows                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| `/sqlite`        | Persistent Drizzle counter with Effect Schema row decoding.                      |
| `/realtime`      | SQLite-backed counter converged across tabs with Datastar SSE and Effect PubSub. |
| `/api`           | GitHub lookup through an Effect service, Schema parsing, and MSW-backed tests.   |
| `/web-component` | Browser-only `<qr-code>` custom element fed by Datastar-bound signals.           |
| `/design`        | Tailwind tokens and shared server-rendered UI primitives.                        |

## Checks

```sh
nub run check
nub run test:e2e
```

Vitest uses isolated temporary SQLite databases. Playwright builds the application, explicitly migrates a temporary database, and starts the compiled Node server.

See `AGENTS.md` for the agent entry point and `docs/` for narrow architecture guides.
