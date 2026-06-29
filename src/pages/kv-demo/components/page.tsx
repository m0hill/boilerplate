import { mod, post } from "datastar-kit"
import { DemoLayout } from "../../../ui/demo.js"
import { KvCount } from "./count.js"

const sources = [
  {
    path: "src/services/kv-counter/kv-counter.ts",
    role: "KvCounter: reads/writes the KV namespace",
  },
  { path: "src/pages/kv-demo/index.tsx", role: "routes, error handling, SSE patch" },
  { path: "src/server.tsx", role: "binds COUNTER_KV into the request context" },
] as const

export const KvPage = ({ count }: { readonly count: number }) => (
  <DemoLayout
    title="KV counter"
    tagline="A counter persisted in a Cloudflare KV namespace. The increment runs server-side as an
      Effect and streams the new value back as a Datastar element patch."
    sources={sources}
  >
    <KvCount count={count} />
    <button
      type="button"
      data-on:click={mod(post("/kv/increment"), { prevent: true })}
      class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Increment
    </button>
  </DemoLayout>
)
