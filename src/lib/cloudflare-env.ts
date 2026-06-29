import { Context } from "effect"

export class CloudflareEnv extends Context.Service<CloudflareEnv, CloudflareBindings>()(
  "CloudflareEnv",
) {}
