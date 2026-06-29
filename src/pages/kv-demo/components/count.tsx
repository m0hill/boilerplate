export const KvCount = ({ count }: { readonly count: number }) => (
  <output
    id="kv-count"
    class="text-5xl font-bold tabular-nums"
  >
    {count.toLocaleString()}
  </output>
)
