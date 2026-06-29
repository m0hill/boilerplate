/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[]
  }
}

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
