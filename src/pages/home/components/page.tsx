import { SITE_TITLE } from "@/lib/constants"
import { DemoCard, type Demo } from "@/pages/home/components/demo-card"

const demos: readonly Demo[] = [
  {
    href: "/realtime",
    title: "SQLite realtime",
    tag: "SSE · Effect PubSub",
    blurb: "Keep a durable SQLite counter converged across browser tabs with Datastar streams.",
  },
  {
    href: "/sqlite",
    title: "SQLite persistence",
    tag: "Drizzle · Effect Schema",
    blurb:
      "Increment a counter persisted through Node's built-in SQLite and decoded at the boundary.",
  },
  {
    href: "/api",
    title: "External API",
    tag: "Fetch · MSW",
    blurb: "Look up a GitHub repo through an Effect service, parsed with Schema, mocked with MSW.",
  },
  {
    href: "/web-component",
    title: "Web component",
    tag: "Custom element",
    blurb:
      "Browser-only logic the minimal-JS way — a signal feeds a <qr-code> element via data-attr.",
  },
  {
    href: "/design",
    title: "Design system",
    tag: "UI",
    blurb:
      "The tokens and UI primitives every page shares — colors, type, buttons, and form controls.",
  },
]

export const HomePage = () => (
  <main
    id="app"
    class="mx-auto flex max-w-3xl flex-col gap-8 p-4 sm:p-8"
  >
    <header class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold sm:text-3xl">{SITE_TITLE}</h1>
      <p class="max-w-2xl text-muted">
        A Node starter built on Effect, Datastar, and datastar-kit. Each page below is a
        self-contained demo of one capability — open it, then read the linked source to copy the
        pattern into your own app.
      </p>
    </header>
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {demos.map((demo) => (
        <DemoCard demo={demo} />
      ))}
    </ul>
  </main>
)
