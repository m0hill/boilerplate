/// <reference types="@cloudflare/workers-types" />

interface CloudflareBindings {
  ASSETS: Fetcher
  COUNTER_KV: KVNamespace
  APP_BUCKET: R2Bucket
  APP_DB: D1Database
  CHAT_ROOM: DurableObjectNamespace<import("./src/resources/chat-room/chat-room").ChatRoom>
  LIVE_ROOMS: DurableObjectNamespace<import("./src/resources/live-rooms/live-room").LiveRoom>
}

declare namespace Cloudflare {
  interface Env extends CloudflareBindings {}
}
