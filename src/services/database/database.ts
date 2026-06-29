import { Context } from "effect"
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1"
import { databaseSchema } from "./schema.js"

export type AppDatabase = DrizzleD1Database<typeof databaseSchema>

export class Database extends Context.Service<Database, AppDatabase>()(
  "boilerplate/services/database/Database",
) {}

export function makeDatabase(d1: CloudflareBindings["APP_DB"]): Database["Service"] {
  return Database.of(drizzle(d1, { schema: databaseSchema }))
}
