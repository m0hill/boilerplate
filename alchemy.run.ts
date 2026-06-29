import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

type ChatRoom = import("./src/resources/chat-room/chat-room").ChatRoom
type LiveRoom = import("./src/resources/live-rooms/live-room").LiveRoom

const compatibilityDate = "2026-05-22"

export default Alchemy.Stack(
  "Boilerplate",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const counterKv = yield* Cloudflare.KV.Namespace("CounterKV", {
      title: "boilerplate-counter",
    })
    const appDb = yield* Cloudflare.D1.Database("AppDB", {
      name: "boilerplate",
      migrationsDir: "./migrations/drizzle",
    })
    const appBucket = yield* Cloudflare.R2.Bucket("AppBucket", {
      name: "boilerplate",
    })

    const worker = yield* Cloudflare.Worker("Worker", {
      name: "boilerplate",
      main: "./src/index.tsx",
      compatibility: {
        date: compatibilityDate,
      },
      assets: "./public",
      dev: {
        port: 8787,
        strictPort: true,
      },
      observability: {
        enabled: true,
        logs: {
          enabled: true,
          invocationLogs: false,
        },
      },
      env: {
        COUNTER_KV: counterKv,
        APP_DB: appDb,
        APP_BUCKET: appBucket,
        CHAT_ROOM: Cloudflare.DurableObject<ChatRoom>("ChatRoom", {
          className: "ChatRoom",
        }),
        LIVE_ROOMS: Cloudflare.DurableObject<LiveRoom>("LiveRoom", {
          className: "LiveRoom",
        }),
      },
    })

    return {
      url: worker.url.as<string>(),
      kvNamespace: counterKv.title,
      databaseName: appDb.databaseName,
      databaseId: appDb.databaseId,
      bucketName: appBucket.bucketName,
    }
  }),
)
