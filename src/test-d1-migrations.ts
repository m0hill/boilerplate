import { applyD1Migrations } from "cloudflare:test"
import { env } from "cloudflare:workers"

await applyD1Migrations(env.APP_DB, env.TEST_MIGRATIONS)
