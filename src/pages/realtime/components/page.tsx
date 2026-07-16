import { get, local, mod, post } from "datastar-kit"
import { RealtimeCountPending } from "@/pages/realtime/components/count"
import { Button } from "@/ui/button"
import { Layout } from "@/ui/layout"

const sources = [
  {
    path: "src/services/realtime-counter/realtime-counter.ts",
    role: "SQLite-backed workflow and application-scoped invalidation pulses",
  },
  {
    path: "src/pages/realtime/index.tsx",
    role: "Datastar page, stream, and command routes",
  },
] as const

const incrementBusy = local<boolean>("realtimeIncrementBusy")

export const RealtimePage = () => (
  <Layout
    title="SQLite realtime counter"
    tagline="Open this page in multiple tabs. Each tab follows durable SQLite truth through a
      single-process Effect PubSub invalidation stream."
    sources={sources}
  >
    <div data-init={get("/realtime/stream")}>
      <RealtimeCountPending />
    </div>
    <Button
      type="button"
      data-indicator={incrementBusy}
      data-on:click={mod(post("/realtime/increment"), { prevent: true })}
      busy={incrementBusy}
      class="w-fit"
    >
      Increment
    </Button>
  </Layout>
)
