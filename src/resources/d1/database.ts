import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1"
import { d1Schema } from "@/resources/d1/schema"

export type D1Database = DrizzleD1Database<typeof d1Schema>

export function makeD1Database(d1: CloudflareBindings["APP_DB"]): D1Database {
  return drizzle(d1, { schema: d1Schema })
}
