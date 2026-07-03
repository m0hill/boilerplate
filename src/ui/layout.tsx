import type { HtmlChild } from "datastar-kit"

type SourceRef = {
  readonly path: string
  readonly role: string
}

export const Layout = ({
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
  <main
    id="app"
    class="mx-auto flex max-w-3xl flex-col gap-8 p-4 sm:p-8"
  >
    <a
      href="/"
      data-nav-prefetch
      class="w-fit text-sm text-muted underline"
    >
      ← Home
    </a>
    <header class="flex flex-col gap-2">
      <p class="text-xs font-semibold uppercase tracking-widest text-muted">Example</p>
      <h1 class="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p class="max-w-2xl text-muted">{tagline}</p>
    </header>
    <section class="flex flex-col gap-6">{children}</section>
    <footer class="mt-2 flex flex-col gap-2 border-t border-border pt-6">
      <p class="text-xs font-semibold uppercase tracking-widest text-muted">Source</p>
      <ul class="flex flex-col gap-1 text-sm">
        {sources.map((source) => (
          <li class="flex flex-wrap gap-x-2">
            <code class="rounded bg-surface px-1.5 py-0.5">{source.path}</code>
            <span class="text-muted">{source.role}</span>
          </li>
        ))}
      </ul>
    </footer>
  </main>
)
