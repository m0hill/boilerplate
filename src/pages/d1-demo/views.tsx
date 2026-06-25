import { mod, post } from "datastar-kit"

export const D1CountView = ({ count }: { count: number }) => (
  <output id="d1-count" class="text-5xl font-bold tabular-nums">
    {count.toLocaleString()}
  </output>
)

export const D1DemoMain = ({ count }: { count: number }) => (
  <main id="app" class="mx-auto flex max-w-4xl flex-col items-start gap-6 p-8 font-sans">
    <a href="/" class="text-sm text-gray-600 underline">
      ← Back home
    </a>
    <h1 class="text-3xl font-bold">D1 demo</h1>
    <p class="max-w-2xl text-gray-700">
      A persistent counter backed by Cloudflare D1, queried with Drizzle ORM, and parsed at the
      database boundary with Effect Schema.
    </p>
    <D1CountView count={count} />
    <button
      type="button"
      data-on:click={mod(post("/d1/increment"), { prevent: true })}
      class="rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Increment D1 counter
    </button>
  </main>
)
