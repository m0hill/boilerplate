# Alchemy

## Model

- Stack = resource graph in `Alchemy.Stack(...)`.
- Stage = isolated stack instance.
- Default stage is `dev_$USER`.
- Pass `--stage` for shared, prod, staging, and PR environments.
- Profile = Cloudflare credentials.
- Profiles are orthogonal to stages.
- Use `--profile` or `ALCHEMY_PROFILE` only for credentials.
- Resource = Worker, KV, D1, R2, DO namespace, or similar Cloudflare object.
- Binding = how a resource reaches Worker runtime code.
- Declare async Worker bindings in `Worker.env`.
- State lives in `Cloudflare.state()`.
- Do not edit Alchemy state.
- Outputs are lazy.
- Pass Outputs through props or stack output.
- Do not read Outputs eagerly.

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
- Do not set `name`, `title`, bucket names, database IDs, or Worker names unless adopting.
- Keep shared resource consts top-level.
- Export resource consts only when another file needs them.
- Export the Worker resource.
- Derive env types from the Worker resource.

```ts
export const Worker = Cloudflare.Worker("Worker", {
  /* ... */
})

export type WorkerEnv = Cloudflare.InferEnv<typeof Worker>
```

- `worker-env.d.ts` aliases the inferred type.
- Do not hand-write `CloudflareBindings` unless inference fails.
- Raw bindings enter at `src/index.tsx`.
- Adapt raw bindings into narrow services.

## Assets

- Serve assets through Worker assets.
- Keep `runWorkerFirst: false` unless Worker-first routing is intentional.
- `runWorkerFirst: false` keeps CSS/JS out of the app router in dev.
- It also matches Cloudflare asset-first behavior.
- Do not add app routes for `/app.css` or `/js/*`.
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
- Do not add Wrangler migration apply scripts.

## Durable Objects

- Class methods are the typed RPC surface.
- Let Alchemy derive namespace/stub types from actual DO methods.
- Use `DurableObject<unknown>` when the DO does not read env.
- This avoids `WorkerEnv -> DO namespace -> DO class -> CloudflareBindings` cycles.
- Use a narrow local env type when the DO reads env.
- Do not use global `CloudflareBindings` inside DO classes.
- Export DO classes from `src/index.tsx`.
- Run DO SQLite migrations with `blockConcurrencyWhile`.

```ts
export class ChatRoom extends DurableObject<unknown> {}

Cloudflare.DurableObject<ChatRoom>("ChatRoom", { className: "ChatRoom" })
```

## Adoption

- Prefer generated names for new resources.
- Fixed names weaken stage isolation.
- For existing Wrangler resources, temporarily set matching names.
- Run `alchemy deploy --dry-run --adopt`.
- Inspect the plan.
- Run `alchemy deploy --adopt` once.
- Remove fixed names unless still required.

## Check

- No Wrangler deploy path.
- No `wrangler.jsonc`.
- No Wrangler migrate path.
- No fixed physical names unless adoption requires them.
- `WorkerEnv` comes from `Cloudflare.InferEnv<typeof Worker>`.
- `CloudflareBindings` is not manually duplicated.
- Assets use `runWorkerFirst: false`.
- Env-free DOs extend `DurableObject<unknown>`.
- Run `nub run check`.
- Run `nub run test:e2e` after asset routing or dev-server changes.

## Troubleshooting

- Missing CSS or JS: run `nub run build`, verify `runWorkerFirst: false`, restart dev.
- DO type cycle: use `DurableObject<unknown>` or a narrow local env.
- Port 8787 conflict: `strictPort` is true, so stop the conflicting process.
- Destroy fear: pass `--stage` explicitly.
