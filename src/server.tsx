import { Context, Layer, Logger } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/unstable/http"
import { CloudflareEnv } from "./cloudflare-env.js"
import { Database, makeDatabase } from "./db/database.js"
import { counterRoutes } from "./pages/counter/counter.js"
import { CounterStore, makeCounterStore } from "./pages/counter/store.js"
import { d1DemoRoutes } from "./pages/d1-demo/d1-demo.js"
import { D1CounterStore, makeD1CounterStore } from "./pages/d1-demo/store.js"
import { GitHubRepos } from "./pages/home/github.js"
import { homeRoutes } from "./pages/home/home.js"
import { notFoundRoute } from "./pages/not-found.js"

const GitHubReposLive = GitHubRepos.layer.pipe(Layer.provide(FetchHttpClient.layer))

const AppLayer = Layer.mergeAll(homeRoutes, counterRoutes, d1DemoRoutes, notFoundRoute).pipe(
  HttpRouter.provideRequest(GitHubReposLive),
  Layer.provide(Logger.layer([Logger.consoleJson])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

const requestContext = (env: CloudflareBindings) => {
  const database = makeDatabase(env.APP_DB)

  return Context.make(CloudflareEnv, env).pipe(
    Context.add(Database, database),
    Context.add(CounterStore, makeCounterStore(env.COUNTER_KV)),
    Context.add(D1CounterStore, makeD1CounterStore(database)),
  )
}

export default {
  fetch: (request: Request, env: CloudflareBindings): Promise<Response> =>
    handler(request, requestContext(env)),
}
