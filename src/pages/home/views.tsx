import { SITE_TITLE } from "../../constants.js"

type Demo = {
  readonly href: string
  readonly title: string
  readonly tag: string
  readonly blurb: string
}

const demos: readonly Demo[] = [
  {
    href: "/kv",
    title: "KV counter",
    tag: "Workers KV",
    blurb: "A counter persisted in a Cloudflare KV namespace, incremented server-side in Effect.",
  },
  {
    href: "/d1",
    title: "D1 + Drizzle counter",
    tag: "D1 · Drizzle",
    blurb: "The same counter on D1 (SQLite) via Drizzle, with rows parsed by Effect Schema.",
  },
  {
    href: "/r2",
    title: "R2 object store",
    tag: "R2",
    blurb: "Save, list, open, and delete text objects in an R2 bucket, each op a typed Effect.",
  },
  {
    href: "/do",
    title: "Durable Object",
    tag: "DO · Drizzle",
    blurb: "Per-room chat — each room is one DO with its own SQLite DB, migrated by Drizzle.",
  },
  {
    href: "/live-counter",
    title: "Live counter",
    tag: "D1 · DO fan-out",
    blurb:
      "Realtime sync the production way — D1 is the source of truth, a generic DO room fans patches to every tab.",
  },
  {
    href: "/api",
    title: "External API",
    tag: "HttpClient · MSW",
    blurb: "Look up a GitHub repo with Effect's HttpClient, parsed with Schema, mocked with MSW.",
  },
  {
    href: "/web-component",
    title: "Web component",
    tag: "Custom element",
    blurb:
      "Browser-only logic the minimal-JS way — a signal feeds a <qr-code> element via data-attr.",
  },
]

const DemoCard = ({ demo }: { demo: Demo }) => (
  <li>
    <a
      href={demo.href}
      class="flex h-full flex-col gap-2 rounded-lg border border-gray-200 p-5 transition hover:border-gray-400 hover:bg-gray-50"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">{demo.title}</h2>
        <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {demo.tag}
        </span>
      </div>
      <p class="text-sm text-gray-600">{demo.blurb}</p>
      <span class="mt-auto text-sm font-medium text-gray-900">Open demo →</span>
    </a>
  </li>
)

export const HomeMain = () => (
  <main id="app" class="mx-auto flex max-w-3xl flex-col gap-8 p-8 font-sans">
    <header class="flex flex-col gap-3">
      <h1 class="text-3xl font-bold">{SITE_TITLE}</h1>
      <p class="max-w-2xl text-gray-600">
        A Cloudflare Workers starter built on Effect, Datastar, and datastar-kit. Each page below is
        a self-contained demo of one capability — open it, then read the linked source to copy the
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
