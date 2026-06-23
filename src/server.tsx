import { Context, Layer, Logger } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/unstable/http"
import { CloudflareEnv } from "./cloudflare-env.js"
import { counterRoutes } from "./pages/counter/counter.js"
import { homeRoutes } from "./pages/home/home.js"
import { notFoundRoute } from "./pages/not-found.js"

const AppLayer = Layer.mergeAll(homeRoutes, counterRoutes, notFoundRoute).pipe(
  HttpRouter.provideRequest(FetchHttpClient.layer),
  Layer.provide(Logger.layer([Logger.consoleJson])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer)

export default {
  fetch: (request: Request, env: CloudflareBindings): Promise<Response> =>
    handler(request, Context.make(CloudflareEnv, env)),
}
