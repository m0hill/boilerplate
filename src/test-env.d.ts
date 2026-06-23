/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare module "@msw/cloudflare" {
  import type { RequestHandler } from "msw"

  export interface Network {
    enable: () => void
    disable: () => void
    use: (...handlers: RequestHandler[]) => void
    resetHandlers: (...handlers: RequestHandler[]) => void
    restoreHandlers: () => void
  }

  export function setupNetwork(): Network
}
