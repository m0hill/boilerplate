import { Context, Layer, Logger } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/unstable/http"
import { CloudflareEnv } from "./cloudflare-env.js"
import { counterRoutes } from "./pages/counter/counter.js"
import { CounterStore, makeCounterStore } from "./pages/counter/store.js"
import { GitHubRepos } from "./pages/home/github.js"
import { homeRoutes } from "./pages/home/home.js"
import { notFoundRoute } from "./pages/not-found.js"

const GitHubReposLive = GitHubRepos.layer.pipe(Layer.provide(FetchHttpClient.layer))

const AppLayer = Layer.mergeAll(homeRoutes, counterRoutes, notFoundRoute).pipe(
  HttpRouter.provideRequest(GitHubReposLive),
  Layer.provide(Logger.layer([Logger.consoleJson])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

const requestContext = (env: CloudflareBindings) =>
  Context.make(CloudflareEnv, env).pipe(Context.add(CounterStore, makeCounterStore(env.COUNTER_KV)))

/** Cloudflare Worker module entrypoint. */
export default {
  fetch: (request: Request, env: CloudflareBindings): Promise<Response> =>
    handler(request, requestContext(env)),
}
