export const RealtimeCount = ({ count }: { readonly count: number }) => (
  <output
    id="realtime-count"
    class="text-5xl font-bold tabular-nums"
    aria-live="polite"
  >
    {count.toLocaleString()}
  </output>
)

export const RealtimeCountPending = () => (
  <output
    id="realtime-count"
    class="text-5xl font-bold tabular-nums"
    aria-live="polite"
  >
    Connecting…
  </output>
)
