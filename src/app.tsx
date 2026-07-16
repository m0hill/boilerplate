import { NodeHttpServer } from "@effect/platform-node"
import { Effect, Layer, Logger } from "effect"
import { HttpMiddleware, HttpRouter } from "effect/unstable/http"
import { makeRequestLog, RequestLog } from "@/lib/observability/request-log"
import { wideEventLogger } from "@/lib/observability/wide-event"
import { apiDemoRoutes } from "@/pages/api-demo/index"
import { designRoutes } from "@/pages/design/index"
import { homeRoutes } from "@/pages/home/index"
import { notFoundRoute } from "@/pages/not-found"
import { webComponentDemoRoutes } from "@/pages/web-component-demo/index"
import { GitHubRepos, makeGitHubRepos } from "@/services/github-repos/github-repos"
import { staticAssetRoutes } from "@/server/static-assets"

type AppOptions = {
  readonly fetch?: typeof globalThis.fetch
  readonly publicDirectory?: string
}

const requestLogMiddleware = HttpRouter.middleware<{ provides: RequestLog }>()(
  Effect.succeed(
    HttpMiddleware.make((httpApp) =>
      Effect.suspend(() =>
        wideEventLogger(httpApp).pipe(Effect.provideService(RequestLog, makeRequestLog())),
      ),
    ),
  ),
).layer

export const makeAppLayer = (options: AppOptions = {}) =>
  Layer.mergeAll(
    staticAssetRoutes(options.publicDirectory ?? "dist/public"),
    homeRoutes,
    apiDemoRoutes,
    webComponentDemoRoutes,
    designRoutes,
    notFoundRoute,
  ).pipe(
    HttpRouter.provideRequest(
      Layer.succeed(GitHubRepos)(makeGitHubRepos(options.fetch ?? globalThis.fetch)),
    ),
    Layer.provide(requestLogMiddleware),
    Layer.provideMerge(Logger.layer([Logger.consoleStructured])),
  )

export const AppLayer = makeAppLayer()

export const makeAppHandler = (options: AppOptions = {}) =>
  HttpRouter.toWebHandler(
    makeAppLayer(options).pipe(HttpRouter.provideRequest(NodeHttpServer.layerHttpServices)),
    { disableLogger: true },
  )
