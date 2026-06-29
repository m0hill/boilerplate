export const D1Count = ({ count }: { readonly count: number }) => (
  <output
    id="d1-count"
    class="text-5xl font-bold tabular-nums"
  >
    {count.toLocaleString()}
  </output>
)
