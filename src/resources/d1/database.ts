import { drizzle } from "drizzle-orm/d1"

export function makeD1Database(d1: CloudflareBindings["APP_DB"]) {
  return drizzle(d1)
}

export type D1DrizzleDatabase = ReturnType<typeof makeD1Database>
