import { Context, Layer, Logger } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/unstable/http"
import { CloudflareEnv } from "./cloudflare-env.js"
import { Database, makeDatabase } from "./db/database.js"
import { apiDemoRoutes } from "./pages/api-demo/api-demo.js"
import { GitHubRepos } from "./pages/api-demo/github.js"
import { d1DemoRoutes } from "./pages/d1-demo/d1-demo.js"
import { D1CounterStore, makeD1CounterStore } from "./pages/d1-demo/store.js"
import { homeRoutes } from "./pages/home/home.js"
import { kvDemoRoutes } from "./pages/kv-demo/kv-demo.js"
import { KvCounterStore, makeKvCounterStore } from "./pages/kv-demo/store.js"
import { notFoundRoute } from "./pages/not-found.js"
import { r2DemoRoutes } from "./pages/r2-demo/r2-demo.js"
import { makeR2ObjectStore, R2ObjectStore } from "./pages/r2-demo/store.js"
import { webComponentDemoRoutes } from "./pages/web-component-demo/web-component-demo.js"

const GitHubReposLive = GitHubRepos.layer.pipe(Layer.provide(FetchHttpClient.layer))

const AppLayer = Layer.mergeAll(
  homeRoutes,
  kvDemoRoutes,
  d1DemoRoutes,
  r2DemoRoutes,
  apiDemoRoutes,
  webComponentDemoRoutes,
  notFoundRoute,
).pipe(
  HttpRouter.provideRequest(GitHubReposLive),
  Layer.provide(Logger.layer([Logger.consoleJson])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

const requestContext = (env: CloudflareBindings) => {
  const database = makeDatabase(env.APP_DB)

  return Context.make(CloudflareEnv, env).pipe(
    Context.add(Database, database),
    Context.add(KvCounterStore, makeKvCounterStore(env.COUNTER_KV)),
    Context.add(D1CounterStore, makeD1CounterStore(database)),
    Context.add(R2ObjectStore, makeR2ObjectStore(env.APP_BUCKET)),
  )
}

export default {
  fetch: (request: Request, env: CloudflareBindings): Promise<Response> =>
    handler(request, requestContext(env)),
}
