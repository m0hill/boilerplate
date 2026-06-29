import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"
import type { ChatRoom } from "./src/resources/chat-room/chat-room"
import type { LiveRoom } from "./src/resources/live-rooms/live-room"

const CounterKV = Cloudflare.KV.Namespace("CounterKV")

const AppDB = Cloudflare.D1.Database("AppDB", {
  migrationsDir: "./migrations/drizzle",
})

const AppBucket = Cloudflare.R2.Bucket("AppBucket")

export const Worker = Cloudflare.Worker("Worker", {
  main: "./src/index.tsx",
  compatibility: {
    date: "2026-05-22",
  },
  assets: {
    directory: "./public",
    runWorkerFirst: false,
  },
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
    COUNTER_KV: CounterKV,
    APP_DB: AppDB,
    APP_BUCKET: AppBucket,
    CHAT_ROOM: Cloudflare.DurableObject<ChatRoom>("ChatRoom", {
      className: "ChatRoom",
    }),
    LIVE_ROOMS: Cloudflare.DurableObject<LiveRoom>("LiveRoom", {
      className: "LiveRoom",
    }),
  },
})

export type WorkerEnv = Cloudflare.InferEnv<typeof Worker>

export default Alchemy.Stack(
  "Boilerplate",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const counterKv = yield* CounterKV
    const appDb = yield* AppDB
    const appBucket = yield* AppBucket
    const worker = yield* Worker

    return {
      url: worker.url.as<string>(),
      kvNamespace: counterKv.title,
      databaseName: appDb.databaseName,
      databaseId: appDb.databaseId,
      bucketName: appBucket.bucketName,
    }
  }),
)
