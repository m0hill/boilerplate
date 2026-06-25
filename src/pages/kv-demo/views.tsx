import { mod, post } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"

const sources = [
  { path: "src/pages/kv-demo/store.ts", role: "KvCounterStore: reads/writes the KV namespace" },
  { path: "src/pages/kv-demo/kv-demo.tsx", role: "routes, error handling, SSE patch" },
  { path: "src/server.tsx", role: "binds COUNTER_KV into the request context" },
] as const

export const KvCountView = ({ count }: { count: number }) => (
  <output id="kv-count" class="text-5xl font-bold tabular-nums">
    {count.toLocaleString()}
  </output>
)

export const KvDemoMain = ({ count }: { count: number }) => (
  <DemoLayout
    title="KV counter"
    tagline="A counter persisted in a Cloudflare KV namespace. The increment runs server-side as an
      Effect and streams the new value back as a Datastar element patch."
    sources={sources}
  >
    <KvCountView count={count} />
    <button
      type="button"
      data-on:click={mod(post("/kv/increment"), { prevent: true })}
      class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Increment
    </button>
  </DemoLayout>
)
