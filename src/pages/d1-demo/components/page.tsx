import { mod, post } from "datastar-kit"
import { Layout } from "@/ui/layout"
import { D1Count } from "@/pages/d1-demo/components/count"

const sources = [
  {
    path: "src/resources/d1/counter-schema.ts",
    role: "Drizzle table + Effect Schema for the row",
  },
  {
    path: "src/resources/d1/counter.ts",
    role: "D1Counter: Drizzle query, parsed at the boundary",
  },
  { path: "migrations/drizzle/", role: "generated migrations applied to D1" },
] as const

export const D1Page = ({ count }: { readonly count: number }) => (
  <Layout
    title="D1 + Drizzle counter"
    tagline="The same counter, persisted in Cloudflare D1 (SQLite) through Drizzle ORM. Every row is
      parsed with Effect Schema at the database boundary, so the rest of the code trusts its types."
    sources={sources}
  >
    <D1Count count={count} />
    <button
      type="button"
      data-on:click={mod(post("/d1/increment"), { prevent: true })}
      class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Increment
    </button>
  </Layout>
)
