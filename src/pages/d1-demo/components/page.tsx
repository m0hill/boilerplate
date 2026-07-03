import { local, mod, post } from "datastar-kit"
import { Button } from "@/ui/button"
import { Layout } from "@/ui/layout"
import { D1Count } from "@/pages/d1-demo/components/count"

const sources = [
  {
    path: "src/resources/d1/schema.ts",
    role: "Drizzle table + Effect Schema for the row",
  },
  {
    path: "src/resources/d1/counter.ts",
    role: "D1Counter: Drizzle query, parsed at the boundary",
  },
  { path: "migrations/drizzle/", role: "generated migrations applied to D1" },
] as const

const incrementBusy = local<boolean>("incrementBusy")

export const D1Page = ({ count }: { readonly count: number }) => (
  <Layout
    title="D1 + Drizzle counter"
    tagline="The same counter, persisted in Cloudflare D1 (SQLite) through Drizzle ORM. Every row is
      parsed with Effect Schema at the database boundary, so the rest of the code trusts its types."
    sources={sources}
  >
    <D1Count count={count} />
    <Button
      type="button"
      data-indicator={incrementBusy}
      data-on:click={mod(post("/d1/increment"), { prevent: true })}
      busy={incrementBusy}
      class="w-fit"
    >
      Increment
    </Button>
  </Layout>
)
