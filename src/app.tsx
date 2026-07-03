import { Context, Layer, Logger } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { makeRequestLog, RequestLog } from "@/lib/observability/request-log"
import { wideEventLogger } from "@/lib/observability/wide-event"
import { apiDemoRoutes } from "@/pages/api-demo/index"
import { d1DemoRoutes } from "@/pages/d1-demo/index"
import { designRoutes } from "@/pages/design/index"
import { doDemoRoutes } from "@/pages/do-demo/index"
import { homeRoutes } from "@/pages/home/index"
import { kvDemoRoutes } from "@/pages/kv-demo/index"
import { liveCounterRoutes } from "@/pages/live-counter/index"
import { notFoundRoute } from "@/pages/not-found"
import { r2DemoRoutes } from "@/pages/r2-demo/index"
import { webComponentDemoRoutes } from "@/pages/web-component-demo/index"
import { ChatRooms, makeChatRooms } from "@/resources/chat-room/chat-rooms"
import { D1Counter, makeD1Counter } from "@/resources/d1/counter"
import { makeD1Database } from "@/resources/d1/database"
import { KvCounter, makeKvCounter } from "@/resources/kv-counter/kv-counter"
import { LiveCounter, makeLiveCounter } from "@/resources/live-counter/live-counter"
import { LiveRooms, makeLiveRooms } from "@/resources/live-rooms/live-rooms"
import { makeR2Objects, R2Objects } from "@/resources/r2-objects/r2-objects"
import { GitHubRepos, makeGitHubRepos } from "@/services/github-repos/github-repos"

export const AppLayer = Layer.mergeAll(
  homeRoutes,
  kvDemoRoutes,
  d1DemoRoutes,
  r2DemoRoutes,
  doDemoRoutes,
  liveCounterRoutes,
  apiDemoRoutes,
  webComponentDemoRoutes,
  designRoutes,
  notFoundRoute,
).pipe(
  Layer.provide(HttpRouter.middleware(wideEventLogger).layer),
  Layer.provideMerge(Logger.layer([Logger.consoleStructured])),
)

const { handler } = HttpRouter.toWebHandler(AppLayer, { disableLogger: true })

export const makeRequestContext = (env: CloudflareBindings) => {
  const database = makeD1Database(env.APP_DB)
  const d1Counter = makeD1Counter(database)
  const liveRooms = makeLiveRooms(env.LIVE_ROOMS)

  return Context.empty().pipe(
    Context.add(KvCounter, makeKvCounter(env.COUNTER_KV)),
    Context.add(D1Counter, d1Counter),
    Context.add(R2Objects, makeR2Objects(env.APP_BUCKET)),
    Context.add(ChatRooms, makeChatRooms(env.CHAT_ROOM)),
    Context.add(LiveRooms, liveRooms),
    Context.add(LiveCounter, makeLiveCounter(d1Counter, liveRooms)),
    Context.add(RequestLog, makeRequestLog()),
    Context.add(
      GitHubRepos,
      makeGitHubRepos((input, init) => globalThis.fetch(input, init)),
    ),
  )
}

export type AppContext = ReturnType<typeof makeRequestContext>

export const handle = (request: Request, context: AppContext): Promise<Response> =>
  handler(request, context)

export const handleWithEnv = (request: Request, env: CloudflareBindings): Promise<Response> =>
  handle(request, makeRequestContext(env))
