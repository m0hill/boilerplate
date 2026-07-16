import { local, mod, post } from "datastar-kit"
import { SqliteCount } from "@/pages/sqlite/components/count"
import { Button } from "@/ui/button"
import { Layout } from "@/ui/layout"

const sources = [
  {
    path: "src/services/sqlite/schema.ts",
    role: "Drizzle table and Effect Schema row decoder",
  },
  {
    path: "src/services/sqlite/counter.ts",
    role: "Typed persistence operations and errors",
  },
  { path: "migrations/sqlite/", role: "generated migrations applied explicitly" },
] as const

const incrementBusy = local<boolean>("sqliteIncrementBusy")

export const SqlitePage = ({ count }: { readonly count: number }) => (
  <Layout
    title="SQLite + Drizzle counter"
    tagline="A counter persisted by Node's built-in SQLite through Drizzle ORM. Stored rows are
      decoded with Effect Schema before they enter the application."
    sources={sources}
  >
    <SqliteCount count={count} />
    <Button
      type="button"
      data-indicator={incrementBusy}
      data-on:click={mod(post("/sqlite/increment"), { prevent: true })}
      busy={incrementBusy}
      class="w-fit"
    >
      Increment
    </Button>
  </Layout>
)
