import { ManagedRuntime } from "effect"
import { FetchHttpClient } from "effect/unstable/http"

/**
 * Application runtime for executing Effects at the imperative shell (Hono route
 * handlers). Provides a `fetch`-based {@link HttpClient.HttpClient}, so the same
 * code runs on the Cloudflare Workers runtime and under the Workers test pool.
 *
 * Created once per module instance and reused across requests; the layer is
 * stateless, so sharing it is safe.
 */
export const runtime = ManagedRuntime.make(FetchHttpClient.layer)
