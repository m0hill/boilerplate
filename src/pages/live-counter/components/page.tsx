import { get, mod, post } from "datastar-kit"
import { DemoLayout } from "../../../ui/demo.js"
import { LiveCount } from "./count.js"

const sources = [
  {
    path: "src/services/live-rooms/live-room.ts",
    role: "generic pulse hub DO: one per room name, no payloads, sliding PubSub",
  },
  {
    path: "src/services/live-rooms/live-rooms.ts",
    role: "worker-side LiveRooms: subscribe / publish pulses by room name over RPC",
  },
  {
    path: "src/services/d1-counter/d1-counter.ts",
    role: "D1Counter: the D1 table is the source of truth (the DO holds no state)",
  },
  {
    path: "src/pages/live-counter/index.tsx",
    role: "the live stream re-reads D1 and re-renders on every signal; the command just writes + wakes",
  },
] as const

export const LiveCounterPage = ({ count }: { readonly count: number }) => (
  <DemoLayout
    title="Live counter"
    tagline="The stream renders the current D1 count on connect and after every payload-free DO
      pulse. Commands only write D1 and wake the room, so reconnects and out-of-order pulses converge
      on the latest count. Open this page in two tabs; incrementing in one updates both."
    sources={sources}
  >
    <div data-init={get("/live-counter/stream")} class="flex flex-col gap-6">
      <LiveCount count={count} />
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
