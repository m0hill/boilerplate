import { Context, Layer, Logger } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { makeRequestLog, RequestLog } from "@/lib/observability/request-log"
import { wideEventLogger } from "@/lib/observability/wide-event"
import { apiDemoRoutes } from "@/pages/api-demo/index"
import { d1DemoRoutes } from "@/pages/d1-demo/index"
import { doDemoRoutes } from "@/pages/do-demo/index"
import { homeRoutes } from "@/pages/home/index"
import { kvDemoRoutes } from "@/pages/kv-demo/index"
import { liveCounterRoutes } from "@/pages/live-counter/index"
import { notFoundRoute } from "@/pages/not-found"
import { r2DemoRoutes } from "@/pages/r2-demo/index"
import { webComponentDemoRoutes } from "@/pages/web-component-demo/index"
import { D1Counter, makeD1Counter } from "@/resources/d1/counter"
import { makeD1Database } from "@/resources/d1/database"
import { GitHubRepos, makeGitHubRepos } from "@/services/github-repos/github-repos"
import { ChatRooms, makeChatRooms } from "@/resources/chat-room/chat-rooms"
import { KvCounter, makeKvCounter } from "@/resources/kv-counter/kv-counter"
import { LiveRooms, makeLiveRooms } from "@/resources/live-rooms/live-rooms"
import { makeR2Objects, R2Objects } from "@/resources/r2-objects/r2-objects"

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
  Layer.provideMerge(Logger.layer([Logger.consoleStructured])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer, { disableLogger: true })

const requestContext = (env: CloudflareBindings) => {
  const database = makeD1Database(env.APP_DB)

  return Context.empty().pipe(
    Context.add(KvCounter, makeKvCounter(env.COUNTER_KV)),
    Context.add(D1Counter, makeD1Counter(database)),
    Context.add(R2Objects, makeR2Objects(env.APP_BUCKET)),
    Context.add(ChatRooms, makeChatRooms(env.CHAT_ROOM)),
    Context.add(LiveRooms, makeLiveRooms(env.LIVE_ROOMS)),
    Context.add(RequestLog, makeRequestLog()),
    Context.add(
      GitHubRepos,
      makeGitHubRepos((input, init) => globalThis.fetch(input, init)),
    ),
  )
}

export { ChatRoom } from "@/resources/chat-room/chat-room"
export { LiveRoom } from "@/resources/live-rooms/live-room"

export default {
  fetch: (request: Request, env: CloudflareBindings): Promise<Response> =>
    handler(request, requestContext(env)),
}
