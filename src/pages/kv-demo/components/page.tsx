import { local, mod, post } from "datastar-kit"
import { Button } from "@/ui/button"
import { Layout } from "@/ui/layout"
import { KvCount } from "@/pages/kv-demo/components/count"

const sources = [
  {
    path: "src/resources/kv-counter/kv-counter.ts",
    role: "KvCounter: reads/writes the KV namespace",
  },
  { path: "src/pages/kv-demo/index.tsx", role: "routes, error handling, SSE patch" },
  { path: "src/index.tsx", role: "binds COUNTER_KV into the request context" },
] as const

const incrementBusy = local<boolean>("incrementBusy")

export const KvPage = ({ count }: { readonly count: number }) => (
  <Layout
    title="KV counter"
    tagline="A counter persisted in a Cloudflare KV namespace. The increment runs server-side as an
      Effect and streams the new value back as a Datastar element patch."
    sources={sources}
  >
    <KvCount count={count} />
    <Button
      type="button"
      data-indicator={incrementBusy}
      data-on:click={mod(post("/kv/increment"), { prevent: true })}
      busy={incrementBusy}
      class="w-fit"
    >
      Increment
    </Button>
  </Layout>
)
