import { mod, post } from "datastar-kit"

/** Live counter value; the target of `/counter/increment` SSE patches. */
export const CountView = ({ count }: { count: number }) => (
  <output id="count" class="text-5xl font-bold tabular-nums">
    {count.toLocaleString()}
  </output>
)

/** Full counter document body: the value, an increment button, and a back link. */
export const CounterMain = ({ count }: { count: number }) => (
  <main id="app" class="mx-auto flex max-w-4xl flex-col items-start gap-6 p-8 font-sans">
    <a href="/" class="text-sm text-gray-600 underline">
      ← Back home
    </a>
    <h1 class="text-3xl font-bold">KV counter</h1>
    <p class="text-gray-700">A persistent counter backed by a Cloudflare KV namespace.</p>
    <CountView count={count} />
    <button
      type="button"
      data-on:click={mod(post("/counter/increment"), { prevent: true })}
      class="rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
    >
      Increment
    </button>
  </main>
)
