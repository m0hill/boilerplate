import { NodeHttpServer } from "@effect/platform-node"
import { Effect, Layer, Logger } from "effect"
import { HttpMiddleware, HttpRouter } from "effect/unstable/http"
import { makeRequestLog, RequestLog } from "@/lib/observability/request-log"
import { wideEventLogger } from "@/lib/observability/wide-event"
import { apiDemoRoutes } from "@/pages/api-demo/index"
import { designRoutes } from "@/pages/design/index"
import { homeRoutes } from "@/pages/home/index"
import { notFoundRoute } from "@/pages/not-found"
import { realtimeRoutes } from "@/pages/realtime/index"
import { sqliteRoutes } from "@/pages/sqlite/index"
import { webComponentDemoRoutes } from "@/pages/web-component-demo/index"
import { GitHubRepos, makeGitHubRepos } from "@/services/github-repos/github-repos"
import { RealtimeCounter } from "@/services/realtime-counter/realtime-counter"
import { SqliteCounter } from "@/services/sqlite/counter"
import { sqliteDatabaseLayer } from "@/services/sqlite/database"
import { ServerConfig } from "@/server/config"
import { staticAssetRoutes } from "@/server/static-assets"

type AppOptions = {
  readonly fetch?: typeof globalThis.fetch
  readonly publicDirectory?: string
  readonly databasePath?: string
  readonly sqliteCounterLayer?: Layer.Layer<SqliteCounter>
  readonly realtimeCounterLayer?: Layer.Layer<RealtimeCounter, never, SqliteCounter>
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
    sqliteRoutes,
    realtimeRoutes,
    apiDemoRoutes,
    webComponentDemoRoutes,
    designRoutes,
    notFoundRoute,
  ).pipe(
    HttpRouter.provideRequest(
      (options.realtimeCounterLayer ?? RealtimeCounter.layer).pipe(
        Layer.provideMerge(
          options.sqliteCounterLayer ??
            SqliteCounter.layer.pipe(Layer.provide(sqliteDatabaseLayer)),
        ),
      ),
    ),
    HttpRouter.provideRequest(
      Layer.succeed(GitHubRepos)(makeGitHubRepos(options.fetch ?? globalThis.fetch)),
    ),
    Layer.provide(requestLogMiddleware),
    Layer.provideMerge(Logger.layer([Logger.consoleStructured])),
  )

export const AppLayer = makeAppLayer()

export const makeAppHandler = (options: AppOptions = {}) =>
  HttpRouter.toWebHandler(
    makeAppLayer(options).pipe(
      Layer.provide(
        Layer.succeed(ServerConfig)(
          ServerConfig.of({
            host: "127.0.0.1",
            port: 3000,
            databasePath: options.databasePath ?? "./data/app.db",
          }),
        ),
      ),
      HttpRouter.provideRequest(NodeHttpServer.layerHttpServices),
    ),
    { disableLogger: true },
  )
