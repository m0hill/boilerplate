import { get, mod, post } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"

const sources = [
  {
    path: "src/realtime/live-room.ts",
    role: "generic fan-out Durable Object: one instance per room name, PubSub + Stream, no database",
  },
  {
    path: "src/realtime/live-rooms.ts",
    role: "worker-side LiveRooms: subscribe/publish a room by name over RPC",
  },
  {
    path: "src/pages/d1-demo/store.ts",
    role: "D1CounterStore: the same D1 table is the source of truth (no DO storage)",
  },
  {
    path: "src/pages/live-counter/live-counter.tsx",
    role: "worker writes D1, returns the immediate patch, and publishes the same patch to the room",
  },
] as const

export const LiveCountView = ({ count }: { count: number }) => (
  <output id="live-count" aria-live="polite" class="text-5xl font-bold tabular-nums">
    {count.toLocaleString()}
  </output>
)

export const LiveCounterMain = ({ count }: { count: number }) => (
  <DemoLayout
    title="Live counter"
    tagline="The production realtime shape: D1 stays the source of truth, and a generic Durable Object
      room only fans out already-rendered Datastar patches to connected tabs. Open this page in two
      tabs — incrementing in one updates both. It increments the same D1 counter as the D1 demo."
    sources={sources}
  >
    <div data-init={get("/live-counter/stream")} class="flex flex-col gap-6">
      <LiveCountView count={count} />
      <button
        type="button"
        data-on:click={mod(post("/live-counter/increment"), { prevent: true })}
        class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
      >
        Increment
      </button>
    </div>
  </DemoLayout>
)
