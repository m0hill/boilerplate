import type { Context } from "hono"
import type { AppEnv } from "../app-env.js"

export const notFound = (c: Context<AppEnv>): Response => c.text("Not Found", 404)
