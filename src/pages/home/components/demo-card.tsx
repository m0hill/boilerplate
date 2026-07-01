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
