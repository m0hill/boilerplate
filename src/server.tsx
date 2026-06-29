import { Context, Layer, Logger } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/unstable/http"
import { CloudflareEnv } from "./lib/cloudflare-env.js"
import { makeRequestLog, RequestLog } from "./lib/observability/request-log.js"
import { wideEventLogger } from "./lib/observability/wide-event.js"
import { apiDemoRoutes } from "./pages/api-demo/index.js"
import { d1DemoRoutes } from "./pages/d1-demo/index.js"
import { doDemoRoutes } from "./pages/do-demo/index.js"
import { homeRoutes } from "./pages/home/index.js"
import { kvDemoRoutes } from "./pages/kv-demo/index.js"
import { liveCounterRoutes } from "./pages/live-counter/index.js"
import { notFoundRoute } from "./pages/not-found.js"
import { r2DemoRoutes } from "./pages/r2-demo/index.js"
import { webComponentDemoRoutes } from "./pages/web-component-demo/index.js"
import { D1Counter, makeD1Counter } from "./services/d1-counter/d1-counter.js"
import { Database, makeDatabase } from "./services/database/database.js"
import { GitHubRepos } from "./services/github-repos/github-repos.js"
import { ChatRooms, makeChatRooms } from "./services/chat-room/chat-rooms.js"
import { KvCounter, makeKvCounter } from "./services/kv-counter/kv-counter.js"
import { LiveRooms, makeLiveRooms } from "./services/live-rooms/live-rooms.js"
import { makeR2Objects, R2Objects } from "./services/r2-objects/r2-objects.js"

const GitHubReposLive = GitHubRepos.layer.pipe(Layer.provide(FetchHttpClient.layer))

const AppLayer = Layer.mergeAll(
  homeRoutes,
  kvDemoRoutes,
  d1DemoRoutes,
  r2DemoRoutes,
  doDemoRoutes,
  liveCounterRoutes,
  apiDemoRoutes,
  webComponentDemoRoutes,
  notFoundRoute,
).pipe(
  Layer.provide(HttpRouter.middleware(wideEventLogger).layer),
  HttpRouter.provideRequest(GitHubReposLive),
  Layer.provideMerge(Logger.layer([Logger.consoleJson])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer, { disableLogger: true })

const requestContext = (env: CloudflareBindings) => {
  const database = makeDatabase(env.APP_DB)

  return Context.make(CloudflareEnv, env).pipe(
    Context.add(Database, database),
    Context.add(KvCounter, makeKvCounter(env.COUNTER_KV)),
    Context.add(D1Counter, makeD1Counter(database)),
    Context.add(R2Objects, makeR2Objects(env.APP_BUCKET)),
    Context.add(ChatRooms, makeChatRooms(env.CHAT_ROOM)),
    Context.add(LiveRooms, makeLiveRooms(env.LIVE_ROOMS)),
    Context.add(RequestLog, makeRequestLog()),
  )
}

export { ChatRoom } from "./services/chat-room/chat-room.js"
export { LiveRoom } from "./services/live-rooms/live-room.js"

export default {
  fetch: (request: Request, env: CloudflareBindings): Promise<Response> =>
    handler(request, requestContext(env)),
}
