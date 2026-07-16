export const SqliteCount = ({ count }: { readonly count: number }) => (
  <output
    id="sqlite-count"
    class="text-5xl font-bold tabular-nums"
  >
    {count.toLocaleString()}
  </output>
)
