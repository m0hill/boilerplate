import type { LoggerVariables } from "./observability/index.js"

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: LoggerVariables
}
