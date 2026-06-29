# Alchemy

## Model

- Stack = resource graph in `Alchemy.Stack(...)`.
- Stage = isolated stack instance.
- Default stage is `dev_$USER`.
- Pass `--stage` for shared, prod, staging, and PR environments.
- Profile = Cloudflare credentials.
- Use `--profile` or `ALCHEMY_PROFILE` for credentials.
- Resource = Worker, KV, D1, R2, DO namespace, or similar Cloudflare object.
- Binding = how a resource reaches Worker runtime code.
- Declare Worker bindings in `Worker.env`.
- State lives in `Cloudflare.state()`.
- Outputs are lazy.
- Pass Outputs through props or stack output.

## Commands

- `nub run dev` runs `alchemy dev` on port 8787.
- Use `preview`, `deploy`, `destroy`, `logs`, and `tail` through `nub run`.
- Pass Alchemy flags after `--`.

```sh
nub run deploy -- --stage prod --profile prod
nub run deploy -- --dry-run --stage staging
nub run destroy -- --stage pr-123
```

## Resources

- `alchemy.run.ts` owns resources and Worker bindings.
- Prefer generated physical names.
- Set physical names only for adoption.
- Keep shared resource consts top-level.
- Export resource consts only for cross-file use.
- Export the Worker resource.
- Derive env types from the Worker resource.

```ts
export const Worker = Cloudflare.Worker("Worker", {
  /* ... */
})

export type WorkerEnv = Cloudflare.InferEnv<typeof Worker>
```

- `worker-env.d.ts` aliases the inferred type.
- Raw bindings enter at `src/index.tsx`.
- Adapt raw bindings into narrow services.

## Assets

- Serve assets through Worker assets.
- Keep `runWorkerFirst: false` for asset-first routing.
- Keep generated `public/app.css` and `public/js/*` gitignored.

```ts
assets: {
  directory: "./public",
  runWorkerFirst: false,
}
```

## D1

- Declare D1 with `migrationsDir: "./migrations/drizzle"`.
- Alchemy applies D1 migrations in `alchemy dev` and `alchemy deploy`.
- Keep Drizzle generation scripts.

## Durable Objects

- Class methods are the typed RPC surface.
- Let Alchemy derive namespace/stub types from actual DO methods.
- Use `DurableObject<unknown>` when the DO does not read env.
- Use a narrow local env type when the DO reads env.
- Export DO classes from `src/index.tsx`.
- Run DO SQLite migrations with `blockConcurrencyWhile`.

```ts
export class ChatRoom extends DurableObject<unknown> {}

Cloudflare.DurableObject<ChatRoom>("ChatRoom", { className: "ChatRoom" })
```

## Adoption

- Prefer generated names for new resources.
- Fixed names weaken stage isolation.
- For existing resources, temporarily set matching names.
- Run `alchemy deploy --dry-run --adopt`.
- Inspect the plan.
- Run `alchemy deploy --adopt` once.
- Remove fixed names after adoption when possible.

## Check

- `WorkerEnv` comes from `Cloudflare.InferEnv<typeof Worker>`.
- Assets use `runWorkerFirst: false`.
- Env-free DOs extend `DurableObject<unknown>`.
- Run `nub run check`.
- Run `nub run test:e2e` after asset routing or dev-server changes.
