/// <reference types="@cloudflare/workers-types" />

import type { WorkerEnv } from "./alchemy.run"

declare global {
  type CloudflareBindings = WorkerEnv

  namespace Cloudflare {
    interface Env extends CloudflareBindings {}
  }
}

export {}
