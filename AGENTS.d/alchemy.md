# Alchemy guide

Use this when changing `alchemy.run.ts`, Cloudflare resources/bindings, deployment scripts,
assets, or local dev behavior.

## Mental model

- **Stack**: the resource graph declared by `Alchemy.Stack(...)` in `alchemy.run.ts`.
- **Stage**: an isolated instance of the stack. Default is `dev_$USER`; use `--stage prod`,
  `--stage staging`, or `--stage pr-123` explicitly when needed.
- **Profile**: Cloudflare auth credentials. Profiles are orthogonal to stages; use `--profile prod`
  or `ALCHEMY_PROFILE=prod` only to change credentials.
- **State store**: Alchemy's record of what it manages. This project uses `Cloudflare.state()`.
  Do not edit state by hand.
- **Resource**: a Cloudflare object such as Worker, KV, D1, R2, or a Durable Object namespace.
- **Binding**: how a resource is made available to Worker runtime code. In async Workers, declare
  bindings in `Worker.env` and derive the runtime type with `Cloudflare.InferEnv<typeof Worker>`.
- **Output**: a lazy value returned by a resource, e.g. `worker.url` or `appDb.databaseId`. Pass
  Outputs through resource props or stack output; do not try to read them eagerly.

## Commands

Use `nub` scripts.

- `nub run dev` — build CSS/client JS, watch them, and run `alchemy dev` on port 8787.
- `nub run preview` — build once and run `alchemy dev`.
- `nub run deploy` — build once and run `alchemy deploy` for the selected stage.
- `nub run destroy` — destroy resources in the selected stage only.
- `nub run logs` / `nub run tail` — read Alchemy-managed Worker logs.

Common flags pass after `--` when using npm scripts:

```sh
nub run deploy -- --stage prod --profile prod
nub run deploy -- --dry-run --stage staging
nub run destroy -- --stage pr-123
```

## Resource declaration rules

- `alchemy.run.ts` owns Cloudflare resources and Worker bindings.
- Prefer Alchemy-generated physical names. Do **not** set `name`, `title`, bucket names, database
  IDs, or Worker names unless you are deliberately adopting an existing resource.
- Keep resources as top-level `const`s when the Worker binding and Stack output both need the same
  resource. Do not export resource consts unless another file needs them.
- Export the `Worker` resource so env types can be derived:

```ts
export const Worker = Cloudflare.Worker("Worker", {
  /* ... */
})
export type WorkerEnv = Cloudflare.InferEnv<typeof Worker>
```

- `worker-env.d.ts` should alias the inferred type. Do not hand-write `CloudflareBindings` unless
  Alchemy inference cannot represent a binding.
- Raw Worker bindings enter at `src/index.tsx`; adapt them into narrow Effect services before page
  code uses them.

## Assets

- Use Worker assets in `alchemy.run.ts`:

```ts
assets: {
  directory: "./public",
  runWorkerFirst: false,
}
```

- `runWorkerFirst: false` keeps CSS/JS asset requests out of the app router in `alchemy dev` and
  matches Cloudflare's asset-first behavior.
- Do not add app-level `/app.css` or `/js/*` route hacks unless you are intentionally running the
  Worker before assets.
- Generated assets (`public/app.css`, `public/js/*`) are build output and remain gitignored.

## D1 and migrations

- D1 is declared with `Cloudflare.D1.Database("AppDB", { migrationsDir: "./migrations/drizzle" })`.
- Alchemy applies pending D1 migrations during `alchemy dev` / `alchemy deploy`.
- Keep Drizzle generation scripts, but do not reintroduce Wrangler D1 migration apply scripts for
  normal app flow.

## Durable Objects

For async Workers with class-based Durable Objects:

```ts
export class ChatRoom extends DurableObject<unknown> {
  // public methods become the typed RPC surface
}

Cloudflare.DurableObject<ChatRoom>("ChatRoom", { className: "ChatRoom" })
```

- Let Alchemy derive the namespace/stub type from the actual DO class methods.
- Use `DurableObject<unknown>` when the DO does not read `env`. This avoids a type cycle with
  `WorkerEnv -> DO namespace -> DO class -> CloudflareBindings`.
- If a DO needs bindings, define a narrow local env type for that DO. Do not use global
  `CloudflareBindings` inside the DO class.
- Export DO classes from `src/index.tsx` so the Worker script hosts them.
- DO-owned SQLite migrations still run inside the DO constructor with `blockConcurrencyWhile`.

## Adoption and migration from Wrangler

Normal project flow should be stage-isolated and use generated physical names.

If you must import existing Wrangler-created resources:

1. Review `alchemy.run.ts` and temporarily set physical names to match the existing resources.
2. Run `alchemy deploy --dry-run --adopt` and inspect the plan.
3. Run the one-time `alchemy deploy --adopt` only when the plan is correct.
4. Keep in mind fixed physical names remove stage isolation for those resources. Prefer generated
   names for new projects and new stages.

## Safety checklist

Before handing off Alchemy changes:

- No `wrangler.jsonc` or Wrangler deploy/migrate path was reintroduced.
- No hard-coded physical names unless adoption is explicitly intended.
- `WorkerEnv` is derived with `Cloudflare.InferEnv<typeof Worker>`.
- `CloudflareBindings` is not manually duplicated.
- Assets are configured with `runWorkerFirst: false` unless worker-first routing is intentional.
- DOs that do not use env extend `DurableObject<unknown>`.
- `nub run check` passes. Run `nub run test:e2e` if asset routing, dev server behavior, or browser
  behavior changed.

## Troubleshooting

- **CSS/JS missing in dev**: run `nub run build`, ensure `assets.runWorkerFirst` is `false`, and
  restart `nub run dev` so Alchemy reloads config.
- **Type cycle around `WorkerEnv` / DO namespaces**: a DO probably extends
  `DurableObject<CloudflareBindings>`. Use `DurableObject<unknown>` or a narrow local env type.
- **Port 8787 conflict**: `alchemy.run.ts` uses `strictPort: true`; stop the conflicting process.
- **Destroy fear**: `alchemy destroy` targets only the selected stage from Alchemy state. Always pass
  `--stage` explicitly for shared environments.
