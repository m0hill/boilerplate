import type { HtmlChild } from "datastar-kit"

export type SourceRef = {
  /** Path relative to the repo root, e.g. `src/pages/kv-demo/store.ts`. */
  readonly path: string
  /** One line on what to look at in that file. */
  readonly role: string
}

const SourceList = ({ sources }: { sources: readonly SourceRef[] }) => (
  <footer class="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-6">
    <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Source</p>
    <ul class="flex flex-col gap-1 text-sm">
      {sources.map((source) => (
        <li class="flex flex-wrap gap-x-2">
          <code class="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">{source.path}</code>
          <span class="text-gray-600">{source.role}</span>
        </li>
      ))}
    </ul>
  </footer>
)

/**
 * Shared scaffold for every demo page: a back link, a "Demo" eyebrow, the title
 * and tagline, the interactive body, and the list of files that implement it.
 * Keeping the frame in one place is what makes the pages read as one boilerplate
 * rather than a pile of unrelated screens.
 */
export const DemoLayout = ({
  title,
  tagline,
  sources,
  children,
}: {
  readonly title: string
  readonly tagline: string
  readonly sources: readonly SourceRef[]
  readonly children: HtmlChild
}) => (
  <main id="app" class="mx-auto flex max-w-3xl flex-col gap-8 p-8 font-sans">
    <a href="/" class="w-fit text-sm text-gray-600 underline">
      ← All demos
    </a>
    <header class="flex flex-col gap-2">
      <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Demo</p>
      <h1 class="text-3xl font-bold">{title}</h1>
      <p class="max-w-2xl text-gray-600">{tagline}</p>
    </header>
    <section class="flex flex-col gap-6">{children}</section>
    <SourceList sources={sources} />
  </main>
)
