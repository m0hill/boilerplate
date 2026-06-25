import { mod, post } from "datastar-kit"
import { DemoLayout } from "../../ui/demo.js"

const sources = [
  { path: "src/db/schema.ts", role: "Drizzle table + Effect Schema for the row" },
  {
    path: "src/pages/d1-demo/store.ts",
    role: "D1CounterStore: Drizzle query, parsed at the boundary",
  },
  { path: "drizzle/", role: "generated migrations applied to D1" },
] as const

export const D1CountView = ({ count }: { count: number }) => (
  <output id="d1-count" class="text-5xl font-bold tabular-nums">
    {count.toLocaleString()}
  </output>
)

export const D1DemoMain = ({ count }: { count: number }) => (
  <DemoLayout
    title="D1 + Drizzle counter"
    tagline="The same counter, persisted in Cloudflare D1 (SQLite) through Drizzle ORM. Every row is
      parsed with Effect Schema at the database boundary, so the rest of the code trusts its types."
    sources={sources}
  >
    <D1CountView count={count} />
    <button
      type="button"
      data-on:click={mod(post("/d1/increment"), { prevent: true })}
      class="w-fit rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Increment
    </button>
  </DemoLayout>
)
