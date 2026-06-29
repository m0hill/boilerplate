export const LiveCount = ({ count }: { readonly count: number }) => (
  <output
    id="live-count"
    aria-live="polite"
    class="text-5xl font-bold tabular-nums"
  >
    {count.toLocaleString()}
  </output>
)
