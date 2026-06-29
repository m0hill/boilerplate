import { get, mod, post } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"

const sources = [
  {
    path: "src/pages/live-counter/live-room.ts",
    role: "generic invalidation hub DO: one per room name, sliding PubSub, signals “changed” only",
  },
  {
    path: "src/pages/live-counter/live-rooms.ts",
    role: "worker-side LiveRooms: subscribe to / publish a room's invalidations by name over RPC",
  },
  {
    path: "src/pages/d1-demo/store.ts",
    role: "D1CounterStore: the same D1 table is the source of truth (the DO holds no state)",
  },
  {
    path: "src/pages/live-counter/live-counter.tsx",
    role: "the live stream re-reads D1 and re-renders on every signal; the command just writes + wakes",
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
    tagline="The realtime shape datastar-kit recommends: the live stream renders the same view again
      whenever the data changes, re-reading D1 each time. A generic Durable Object only signals
      “something changed” — it carries no payload, so a reconnecting tab is always correct. Open this
      page in two tabs; incrementing in one updates both. It shares the D1 counter with the D1 demo."
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
