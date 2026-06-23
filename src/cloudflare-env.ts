import { Context } from "effect"

/**
 * Low-level per-request Cloudflare Worker bindings (`env`) for Effects that
 * genuinely need raw Worker access.
 *
 * Prefer narrow domain services for feature code. For example, `src/server.tsx`
 * adapts `env.COUNTER_KV` into the request-scoped `CounterStore` service while
 * also keeping `CloudflareEnv` available for lower-level integrations.
 */
export class CloudflareEnv extends Context.Service<CloudflareEnv, CloudflareBindings>()(
  "CloudflareEnv",
) {}
