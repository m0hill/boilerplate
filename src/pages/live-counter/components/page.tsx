import { get, mod, post } from "datastar-kit"
import { Layout } from "@/ui/layout"
import { LiveCount } from "@/pages/live-counter/components/count"

const sources = [
  {
    path: "src/resources/live-counter/live-counter.ts",
    role: "LiveCounter: owns the D1 counter + pulse-room workflow",
  },
  {
    path: "src/resources/live-rooms/live-room.ts",
    role: "generic pulse hub DO: one per room name, no payloads, sliding PubSub",
  },
  {
    path: "src/resources/d1/counter.ts",
    role: "D1Counter: the D1 table is the source of truth (the DO holds no state)",
  },
  {
    path: "src/pages/live-counter/index.tsx",
    role: "routes render the page and turn LiveCounter results into Datastar responses",
  },
] as const

export const LiveCounterPage = ({ count }: { readonly count: number }) => (
  <Layout
    title="Live counter"
    tagline="The stream renders the current D1 count on connect and after every payload-free DO
      pulse. Commands only write D1 and wake the room, so reconnects and out-of-order pulses converge
      on the latest count. Open this page in two tabs; incrementing in one updates both."
    sources={sources}
  >
    <div
      data-init={get("/live-counter/stream")}
      class="flex flex-col gap-6"
    >
      <LiveCount count={count} />
      <button
        type="button"
        data-on:click={mod(post("/live-counter/increment"), { prevent: true })}
        class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
      >
        Increment
      </button>
    </div>
  </Layout>
)
