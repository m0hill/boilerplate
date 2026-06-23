import type { Context } from "hono"

export const notFound = (c: Context): Response => c.text("Not Found", 404)
