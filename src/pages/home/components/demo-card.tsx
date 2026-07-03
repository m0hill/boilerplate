import { Badge } from "@/ui/badge"

export type Demo = {
  readonly href: string
  readonly title: string
  readonly tag: string
  readonly blurb: string
}

export const DemoCard = ({ demo }: { readonly demo: Demo }) => (
  <li>
    <a
      href={demo.href}
      data-nav-prefetch
      class="flex h-full flex-col gap-2 rounded-lg border border-border p-5 transition hover:border-input hover:bg-surface"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">{demo.title}</h2>
        <Badge>{demo.tag}</Badge>
      </div>
      <p class="text-sm text-muted">{demo.blurb}</p>
      <span class="mt-auto text-sm font-medium">Open demo →</span>
    </a>
  </li>
)
