import { Context } from "effect"

/**
 * Per-request Cloudflare Worker bindings (`env`), made available to Effects.
 *
 * Provided at the worker boundary in `src/server.tsx`:
 * `handler(request, Context.make(CloudflareEnv, env))`. Yield it inside an
 * Effect to reach a binding, e.g. `const { COUNTER_KV } = yield* CloudflareEnv`.
 */
export class CloudflareEnv extends Context.Service<CloudflareEnv, CloudflareBindings>()(
  "CloudflareEnv",
) {}
